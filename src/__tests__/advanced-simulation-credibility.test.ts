import { describe, expect, it } from 'vitest';
import { ApiGatewayModel } from '../engine/components/api-gateway-model';
import { CacheModel } from '../engine/components/cache-model';
import { QueueModel } from '../engine/components/queue-model';
import { RateLimiterModel } from '../engine/components/rate-limiter-model';
import { nearestRankQuantile } from '../engine/metrics/quantile';
import { calculateNetworkTransfer, PROTOCOL_ASSUMPTIONS } from '../engine/network-model';
import {
  applyZoneFailure,
  boundedExponentialBackoff,
  BulkheadModel,
  calculateRetryAmplification,
  evaluateQuorum,
} from '../engine/resilience-model';
import { LoadBalancerRouter } from '../engine/routing/load-balancer';
import {
  mm1Reference,
  nearestRank,
  relativeError,
  SCIENTIFIC_TOLERANCES,
} from '../engine/scientific-validation';
import { calculateScheduledQps, createDefaultTrafficConfig } from '../engine/traffic-schedule';
import {
  getMeasurementPhase,
  parseBoundedWorkloadTrace,
  sampleWorkload,
} from '../engine/workload-model';
import { createDefaultConfig } from '../model/component-defaults';

describe('scientific reference checks', () => {
  it('matches the established stable M/M/1 reference equations', () => {
    const reference = mm1Reference(8, 10);
    expect(reference.utilization).toBe(0.8);
    expect(reference.meanSystemTimeSec).toBeCloseTo(0.5);
    expect(reference.meanQueueDepth).toBeCloseTo(3.2);
    expect(() => mm1Reference(10, 10)).toThrow(/arrival rate < service rate/);
  });

  it('keeps deterministic queue behavior bounded below capacity and growing above it', () => {
    const stable = new QueueModel(100, 10, 1);
    for (let second = 0; second < 5; second++) {
      for (let request = 0; request < 8; request++) stable.enqueue();
      stable.drain(1_000);
    }
    expect(stable.getDepth()).toBe(0);

    const overloaded = new QueueModel(100, 10, 1);
    for (let request = 0; request < 15; request++) overloaded.enqueue();
    overloaded.drain(1_000);
    expect(overloaded.getDepth()).toBe(5);
  });

  it('validates percentiles and throughput with independent calculations', () => {
    const samples = [70, 10, 40, 20, 60, 30, 50];
    const sorted = [...samples].sort((a, b) => a - b);
    expect(nearestRankQuantile(sorted, 0.95)).toBe(nearestRank(samples, 0.95));
    expect(700 / 7).toBe(100);
    expect(relativeError(102, 100)).toBeLessThan(SCIENTIFIC_TOLERANCES.queueApproximation);
  });
});

describe('controlled component schedules', () => {
  it('validates fixed-window and token-bucket rate limiters', () => {
    const fixed = new RateLimiterModel('fixed_window', 2, 1, 2);
    expect([0, 100, 200].map((time) => fixed.allowRequest(time))).toEqual([true, true, false]);
    expect(fixed.allowRequest(1_000)).toBe(true);

    const token = new RateLimiterModel('token_bucket', 2, 1, 2);
    expect([token.allowRequest(0), token.allowRequest(0), token.allowRequest(0)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(token.allowRequest(500)).toBe(true);
  });

  it('validates round-robin and weighted load-balancer shares', () => {
    const roundRobin = new LoadBalancerRouter('round_robin', ['a', 'b', 'c']);
    const roundRobinCounts = { a: 0, b: 0, c: 0 };
    for (let index = 0; index < 300; index++)
      roundRobinCounts[roundRobin.selectTarget(String(index)) as keyof typeof roundRobinCounts]++;
    expect(roundRobinCounts).toEqual({ a: 100, b: 100, c: 100 });

    const weighted = new LoadBalancerRouter('weighted', ['a', 'b', 'c'], { a: 1, b: 2, c: 3 });
    const weightedCounts = { a: 0, b: 0, c: 0 };
    for (let index = 0; index < 600; index++)
      weightedCounts[weighted.selectTarget(String(index)) as keyof typeof weightedCounts]++;
    expect(weightedCounts).toEqual({ a: 100, b: 200, c: 300 });
  });

  it('validates cache hits, misses, TTL, and controlled key traces', () => {
    const cache = new CacheModel({
      sizeLimit: 2,
      evictionPolicy: 'LRU',
      ttlMs: 100,
      readLatencyMs: 1,
    });
    expect(cache.access('hot', 0).hit).toBe(false);
    cache.put('hot', 0);
    expect(cache.access('hot', 50).hit).toBe(true);
    expect(cache.access('cold', 50).hit).toBe(false);
    expect(cache.access('hot', 100).hit).toBe(false);
    expect(cache.getCounts()).toEqual({ hits: 1, misses: 3 });
  });
});

describe('advanced workload, network, and resilience modeling', () => {
  it('models operation mixes, payload distributions, traces, and measurement intervals', () => {
    const config = {
      ...createDefaultTrafficConfig(),
      operationMix: { write: 1 },
      payloadDistribution: 'uniform' as const,
      requestPayloadMinKb: 2,
      requestPayloadMaxKb: 6,
      responsePayloadMinKb: 8,
      responsePayloadMaxKb: 12,
      warmUpSec: 10,
      measurementDurationSec: 20,
    };
    const sample = sampleWorkload(config, 0, () => 0.5);
    expect(sample).toEqual({ operation: 'write', requestPayloadKb: 4, responsePayloadKb: 10 });
    expect(getMeasurementPhase(config, 5)).toBe('warm-up');
    expect(getMeasurementPhase(config, 15)).toBe('measurement');
    expect(getMeasurementPhase(config, 31)).toBe('complete');

    const trace = parseBoundedWorkloadTrace(
      'timeSec,qps,operation,requestPayloadKb,responsePayloadKb\n0,5,read,1,2\n10,50,write,4,8',
    );
    expect(trace).toHaveLength(2);
    expect(calculateScheduledQps({ ...config, pattern: 'custom', workloadTrace: trace }, 12)).toBe(
      50,
    );
    expect(calculateScheduledQps({ ...config, pattern: 'diurnal' }, 43_200)).toBeGreaterThan(
      calculateScheduledQps({ ...config, pattern: 'diurnal' }, 0),
    );
  });

  it('separates propagation, payload transfer, protocol, loss, setup, and zone effects', () => {
    const result = calculateNetworkTransfer({
      protocol: 'UDP',
      baseLatencyMs: 10,
      bandwidthMbps: 8,
      requestPayloadKb: 500,
      responsePayloadKb: 500,
      lossRatePercent: 10,
      retryLimit: 2,
      connectionSetupMs: 5,
      keepAlive: false,
      sourceZoneId: 'a',
      targetZoneId: 'b',
      crossZoneCostPerGb: 0.02,
    });
    expect(result.propagationLatencyMs).toBe(10);
    expect(result.transferLatencyMs).toBe(1_000);
    expect(result.expectedAttempts).toBeCloseTo(1.11);
    expect(result.connectionSetupLatencyMs).toBe(5);
    expect(result.crossZoneLatencyMs).toBe(2);
    expect(result.crossZoneCost).toBeCloseTo(0.00002);
    expect(PROTOCOL_ASSUMPTIONS.UDP.modeledGuarantees).toMatch(/no delivery/);
    expect(PROTOCOL_ASSUMPTIONS.UDP.evidenceBasis).toMatch(/not benchmark-derived/);
  });

  it('models bounded retries, bulkheads, quorum, zone failure, and retry amplification', () => {
    expect(boundedExponentialBackoff(100, 3, () => 0.5)).toBe(400);
    expect(
      boundedExponentialBackoff(10_000, 10, () => 1, {
        maxDelayMs: 30_000,
        jitterPercent: 20,
      }),
    ).toBe(30_000);
    const bulkhead = new BulkheadModel({ search: 1, checkout: 2 });
    expect(bulkhead.acquire('search')).toBe(true);
    expect(bulkhead.acquire('search')).toBe(false);
    expect(bulkhead.acquire('checkout')).toBe(true);
    bulkhead.release('search');
    expect(bulkhead.acquire('search')).toBe(true);
    expect(evaluateQuorum(2, 2, 3)).toEqual({ canRead: true, canWrite: false });
    expect(
      applyZoneFailure(
        [
          { zoneId: 'a', health: 'healthy' as const },
          { zoneId: 'b', health: 'healthy' as const },
        ],
        'a',
      ),
    ).toEqual([
      { zoneId: 'a', health: 'down' },
      { zoneId: 'b', health: 'healthy' },
    ]);
    const baseline = calculateRetryAmplification({
      initialRequests: 100,
      failureRatePercent: 80,
      retryLimit: 4,
      queueCapacity: 250,
    });
    const mitigated = calculateRetryAmplification({
      initialRequests: 100,
      failureRatePercent: 80,
      retryLimit: 1,
      queueCapacity: 250,
    });
    expect(baseline.amplificationFactor).toBeGreaterThan(mitigated.amplificationFactor);
    expect(baseline.droppedRequests).toBeGreaterThan(mitigated.droppedRequests);
  });

  it('retains circuit-breaker half-open recovery semantics', () => {
    const config = createDefaultConfig('api_gateway', 'gateway', 'Gateway');
    if (config.type !== 'api_gateway') throw new Error('unexpected config type');
    const model = new ApiGatewayModel({ ...config, rateLimitQps: 100 });
    for (let attempt = 0; attempt < 3; attempt++) model.finish(attempt, 1, false);
    expect(model.getMetrics().circuitState).toBe('open');
    expect(model.begin(5_000).reason).toBe('open_circuit');
    expect(model.begin(10_002).allowed).toBe(true);
    expect(model.getMetrics().circuitState).toBe('half_open');
    model.finish(10_003, 1, true);
    expect(model.getMetrics().circuitState).toBe('closed');
  });
});
