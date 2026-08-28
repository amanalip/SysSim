import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../model/component-defaults';
import { RedisCacheConfig, SimRequest } from '../model/types';
import { createSimRequest } from '../engine/request';
import { CacheModel } from '../engine/components/cache-model';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { buildMetricsCsv } from '../utils/metrics-export';

const traffic = (seed = 17) => ({
  pattern: 'steady' as const,
  baseQps: 100,
  burstMultiplier: 1,
  rampDurationSec: 1,
  spikeFrequencySec: 1,
  seed,
  requestKeyDistribution: 'uniform' as const,
  requestKeySpaceSize: 1,
});

const cacheGraph = (
  hitRatioPercent: number,
  requestCoalescingEnabled = false,
  health: RedisCacheConfig['health'] = 'healthy',
): SimGraph => ({
  nodes: [
    { id: 'client', config: createDefaultConfig('client', 'client') },
    {
      id: 'cache',
      config: {
        ...createDefaultConfig('redis_cache', 'cache'),
        hitRatioPercent,
        requestCoalescingEnabled,
        health,
      } as RedisCacheConfig,
    },
    { id: 'origin', config: createDefaultConfig('sql_db', 'origin') },
  ],
  edges: [
    { id: 'client-cache', source: 'client', target: 'cache', data: { protocol: 'HTTP', purpose: 'request' } },
    { id: 'cache-origin', source: 'cache', target: 'origin', data: { protocol: 'TCP', purpose: 'fallback' } },
  ],
});

const execute = (engine: SysSimEngine, sequence: number, key = 'product:42') => {
  const request = createSimRequest('client', sequence, key, sequence);
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};

const advanceTo = (engine: SysSimEngine, milliseconds: number) => {
  (engine as unknown as { elapsedSimulationMs: number }).elapsedSimulationMs = milliseconds;
};

const runWarmWorkload = (hitTarget: number, seed: number, count = 1000) => {
  const engine = new SysSimEngine(cacheGraph(hitTarget), traffic(seed));
  execute(engine, 0);
  advanceTo(engine, 100);
  for (let sequence = 1; sequence <= count; sequence++) {
    execute(engine, sequence);
    advanceTo(engine, 100 + sequence);
  }
  return engine.getMetricsSnapshot();
};

describe('cache resilience, observability, and calibration', () => {
  it('bypasses an unavailable cache to origin without inventing request failures', () => {
    const engine = new SysSimEngine(cacheGraph(90, false, 'down'), traffic());
    const requests = Array.from({ length: 20 }, (_, index) => execute(engine, index));
    const metrics = engine.getMetricsSnapshot();

    expect(requests.every((request) => request.status === 'success')).toBe(true);
    expect(requests.every((request) => request.path.map((hop) => hop.nodeId).join(',') === 'client,cache,origin')).toBe(true);
    expect(requests[0].path[1].info).toContain('bypassing to origin');
    expect(metrics.totalRequestsFailed).toBe(0);
    expect(metrics.totalCacheBypasses).toBe(20);
    expect(metrics.componentMetrics.cache.cacheBypasses).toBe(20);
    expect(metrics.componentMetrics.origin.totalRequests).toBe(20);
  });

  it('models a same-key stampede and optionally coalesces followers', () => {
    const stampede = new SysSimEngine(cacheGraph(100, false), traffic());
    execute(stampede, 1);
    execute(stampede, 2);
    expect(stampede.getMetricsSnapshot().componentMetrics.origin.totalRequests).toBe(2);

    const coalesced = new SysSimEngine(cacheGraph(100, true), traffic());
    execute(coalesced, 1);
    const follower = execute(coalesced, 2);
    let metrics = coalesced.getMetricsSnapshot();
    expect(metrics.componentMetrics.origin.totalRequests).toBe(1);
    expect(metrics.totalCacheCoalescedRequests).toBe(1);
    expect(follower.path.at(-1)?.nodeId).toBe('cache');
    expect(follower.path.at(-1)?.info).toContain('coalesced');

    advanceTo(coalesced, 100);
    const hit = execute(coalesced, 3);
    metrics = coalesced.getMetricsSnapshot();
    expect(hit.path.at(-1)?.status).toBe('hit');
    expect(hit.path.at(-1)?.info).toBe('Cache hit — served without origin');
    expect(hit.color).toBe('#06b6d4');
    expect(metrics.componentMetrics.origin.totalRequests).toBe(1);
  });

  it('keeps cache counts and ratios consistent across component and overall telemetry', () => {
    const engine = new SysSimEngine(cacheGraph(100), traffic());
    const miss = execute(engine, 1);
    advanceTo(engine, 100);
    const hit = execute(engine, 2);
    const metrics = engine.getMetricsSnapshot();
    const modelCounts = ((engine as any).cacheModels.get('cache') as CacheModel).getCounts();

    expect(miss.path[1].status).toBe('miss');
    expect(miss.path[1].info).toContain('forwarding to origin');
    expect(hit.path[1].status).toBe('hit');
    expect(metrics.componentMetrics.cache.cacheHits).toBe(1);
    expect(metrics.componentMetrics.cache.cacheMisses).toBe(1);
    expect(modelCounts).toEqual({ hits: 1, misses: 1 });
    expect(metrics.totalCacheHits).toBe(1);
    expect(metrics.totalCacheMisses).toBe(1);
    expect(metrics.componentMetrics.cache.cacheHitRatioPercent).toBe(50);
    expect(metrics.overallCacheHitRatioPercent).toBe(50);

    const csv = buildMetricsCsv([{
      timestampSec: 1,
      p50LatencyMs: 2,
      p95LatencyMs: 3,
      p99LatencyMs: 4,
      throughputQps: 5,
      errorRatePercent: 0,
      cacheHitRatioPercent: 50,
      activeRequests: 0,
      cacheHits: metrics.totalCacheHits,
      cacheMisses: metrics.totalCacheMisses,
      cacheBypasses: metrics.totalCacheBypasses,
      cacheCoalescedRequests: metrics.totalCacheCoalescedRequests,
    }]);
    expect(csv).toContain('CacheHits,CacheMisses,CacheBypasses,CacheCoalescedRequests');
    expect(csv.trim().endsWith(',1,1,0,0')).toBe(true);
  });

  it('produces a repeatable hit ratio within tolerance of the configured target', () => {
    const first = runWarmWorkload(90, 1234);
    const replay = runWarmWorkload(90, 1234);
    expect(first.totalCacheHits).toBe(replay.totalCacheHits);
    expect(first.totalCacheMisses).toBe(replay.totalCacheMisses);
    expect(first.overallCacheHitRatioPercent).toBeGreaterThanOrEqual(87);
    expect(first.overallCacheHitRatioPercent).toBeLessThanOrEqual(93);
  });

  it('turns a 90% hit target into approximately 10% origin traffic', () => {
    const metrics = runWarmWorkload(90, 443, 2000);
    const originRequests = metrics.componentMetrics.origin.totalRequests;
    expect(originRequests / 2001).toBeGreaterThanOrEqual(0.07);
    expect(originRequests / 2001).toBeLessThanOrEqual(0.13);
    expect(originRequests).toBe(metrics.totalCacheMisses);
  });

  it('reduces database load when the configured cache hit target increases', () => {
    const lowTarget = runWarmWorkload(20, 88).componentMetrics.origin.totalRequests;
    const highTarget = runWarmWorkload(80, 88).componentMetrics.origin.totalRequests;
    expect(highTarget).toBeLessThan(lowTarget);
    expect(highTarget).toBeLessThan(lowTarget * 0.4);
  });
});
