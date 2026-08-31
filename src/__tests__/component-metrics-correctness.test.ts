import { describe, expect, it } from 'vitest';
import { SysSimEngine } from '../engine/simulator';
import { createSimRequest } from '../engine/request';
import { capacityUtilizationPercent, effectiveCapacityQps } from '../engine/metrics/capacity';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { createDefaultConfig } from '../model/component-defaults';
import { AppServerConfig, RedisCacheConfig } from '../model/types';
import { CanvasNode } from '../store/use-store';

describe('component metric correctness tasks 197-204', () => {
  it('uses the same replica-aware capacity for utilization and bottleneck detection', () => {
    const config = {
      ...(createDefaultConfig('app_server', 'app') as AppServerConfig),
      replicas: 2,
      maxThroughputQps: 100,
    };
    expect(effectiveCapacityQps(config)).toBe(200);
    expect(capacityUtilizationPercent(config, 100)).toBe(50);
    const node = {
      id: 'app',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config },
    } as CanvasNode;
    const componentMetrics = {
      app: {
        nodeId: 'app',
        nodeName: 'app',
        nodeType: 'app_server' as const,
        qps: 181,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        errorRatePercent: 0,
        activeConnections: 0,
        queueDepth: 0,
        cacheHitRatioPercent: 0,
        utilizationPercent: 90.5,
        totalRequests: 181,
        successfulRequests: 181,
        failedRequests: 0,
      },
    };
    const issues = detectBottlenecks([node], [], {
      totalRequestsSent: 181,
      totalRequestsSuccess: 181,
      totalRequestsFailed: 0,
      currentQps: 181,
      avgEndToEndLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      overallErrorRatePercent: 0,
      overallCacheHitRatioPercent: 0,
      timeSeries: [],
      componentMetrics,
    });
    expect(issues.find((issue) => issue.id === 'overload_app')?.metricValue).toBe('181 / 200 QPS');
  });

  it('publishes canonical cache counters and database active connections', () => {
    const cache = {
      ...(createDefaultConfig('redis_cache', 'cache') as RedisCacheConfig),
      hitRatioPercent: 100,
    };
    const cacheEngine = new SysSimEngine(
      {
        nodes: [
          { id: 'cache', config: cache },
          { id: 'origin', config: createDefaultConfig('app_server', 'origin') },
        ],
        edges: [
          {
            id: 'fallback',
            source: 'cache',
            target: 'origin',
            data: { protocol: 'HTTP', purpose: 'fallback' },
          },
        ],
      },
      {
        pattern: 'steady',
        baseQps: 0,
        burstMultiplier: 1,
        rampDurationSec: 1,
        spikeFrequencySec: 1,
        seed: 1,
      },
    );
    cacheEngine.processRequest(createSimRequest('cache', 0, 'same', 1));
    cacheEngine.start();
    cacheEngine.step(100);
    cacheEngine.processRequest(createSimRequest('cache', 1, 'same', 2));
    const cacheMetric = cacheEngine.getMetricsSnapshot().componentMetrics.cache;
    expect(cacheMetric.cacheHits).toBe(1);
    expect(cacheMetric.cacheMisses).toBe(1);
    expect(cacheMetric.cacheHitRatioPercent).toBe(50);

    const dbEngine = new SysSimEngine({
      nodes: [{ id: 'db', config: createDefaultConfig('sql_db', 'db') }],
      edges: [],
    });
    dbEngine.processRequest(createSimRequest('db', 0, 'row', 1));
    expect(dbEngine.getMetricsSnapshot().componentMetrics.db.activeConnections).toBe(1);
  });

  it('publishes live queue depth after a drain and keeps random samples statistically bounded', () => {
    const queue = { ...createDefaultConfig('message_queue', 'queue'), consumerThroughputPerSec: 1 };
    const engine = new SysSimEngine(
      {
        nodes: [
          { id: 'queue', config: queue },
          { id: 'worker', config: createDefaultConfig('worker', 'worker') },
        ],
        edges: [
          {
            id: 'consume',
            source: 'queue',
            target: 'worker',
            data: { protocol: 'TCP', purpose: 'request' },
          },
        ],
      },
      {
        pattern: 'steady',
        baseQps: 0,
        burstMultiplier: 1,
        rampDurationSec: 1,
        spikeFrequencySec: 1,
        seed: 44,
      },
    );
    for (let index = 0; index < 5; index++)
      engine.processRequest(createSimRequest('queue', index, `key-${index}`, index));
    const before = engine.getMetricsSnapshot().componentMetrics.queue.queueDepth;
    engine.start();
    engine.step(1000);
    const after = engine.getMetricsSnapshot().componentMetrics.queue.queueDepth;
    expect(after).toBeLessThan(before);

    const client = {
      ...createDefaultConfig('client', 'client'),
      latencyDistribution: 'uniform' as const,
      latencyJitterPercent: 20,
    };
    const randomEngine = new SysSimEngine(
      { nodes: [{ id: 'client', config: client }], edges: [] },
      {
        pattern: 'steady',
        baseQps: 0,
        burstMultiplier: 1,
        rampDurationSec: 1,
        spikeFrequencySec: 1,
        seed: 9,
      },
    );
    for (let index = 0; index < 1_000; index++)
      randomEngine.processRequest(createSimRequest('client', index, 'key', index));
    expect(randomEngine.getMetricsSnapshot().successfulAvgLatencyMs).toBeCloseTo(2.02, 1);
  });
});
