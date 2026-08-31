import { describe, expect, it } from 'vitest';
import { SysSimEngine } from '../engine/simulator';
import { createSimRequest } from '../engine/request';
import { nearestRankQuantile } from '../engine/metrics/quantile';
import { createDefaultConfig } from '../model/component-defaults';

describe('metrics contract tasks 189-196', () => {
  it('uses the documented nearest-rank definition for unbiased small samples', () => {
    expect(nearestRankQuantile([10], 0.5)).toBe(10);
    expect(nearestRankQuantile([10, 20], 0.5)).toBe(10);
    expect(nearestRankQuantile([10, 20], 0.95)).toBe(20);
    expect(nearestRankQuantile([1, 2, 3, 4], 0.5)).toBe(2);
  });

  it('keeps offered, accepted, completed, and dropped load distinct', () => {
    const engine = new SysSimEngine({
      nodes: [{ id: 'client', config: createDefaultConfig('client', 'client') }],
      edges: [],
    });
    engine.processRequest(createSimRequest('client', 10, 'key', 1));
    const metrics = engine.getMetricsSnapshot();
    expect(metrics.metricScope).toBe('lifetime-totals-with-bounded-latency-window');
    expect(metrics.totalRequestsOffered).toBe(1);
    expect(metrics.totalRequestsAccepted).toBe(1);
    expect(metrics.totalRequestsCompleted).toBe(1);
    expect(metrics.totalRequestsDropped).toBe(0);
    expect(metrics.offeredLoadQps).toBe(1);
    expect(metrics.acceptedLoadQps).toBe(1);
    expect(metrics.completedThroughputQps).toBe(1);
    expect(metrics.currentQps).toBe(metrics.completedThroughputQps);
  });

  it('matches a hand-calculated latency path and exposes its breakdown', () => {
    const client = { ...createDefaultConfig('client', 'client'), requestPayloadKb: 2 };
    const app = { ...createDefaultConfig('app_server', 'app'), processingLatencyMs: 15 };
    const engine = new SysSimEngine({
      nodes: [
        { id: 'client', config: client },
        { id: 'app', config: app },
      ],
      edges: [
        { id: 'edge', source: 'client', target: 'app', data: { protocol: 'HTTP', latencyMs: 10 } },
      ],
    });
    const request = createSimRequest('client', 0, 'key', 1, { payloadSizeKb: 2 });
    engine.processRequest(request);
    expect(request.totalLatencyMs).toBeCloseTo(27.02, 5);
    expect(request.queueWaitMs).toBe(0);
    expect(request.serviceTimeMs).toBeCloseTo(17.02, 5);
    expect(request.networkTimeMs).toBeCloseTo(10, 5);
    expect(
      (request.queueWaitMs || 0) + (request.serviceTimeMs || 0) + (request.networkTimeMs || 0),
    ).toBeCloseTo(request.totalLatencyMs, 8);
  });

  it('reports failed latency separately from successful percentiles', () => {
    const client = createDefaultConfig('client', 'client');
    const engine = new SysSimEngine({ nodes: [{ id: 'client', config: client }], edges: [] });
    engine.processRequest(createSimRequest('client', 0, 'success', 1));
    engine.setGraph({
      nodes: [{ id: 'client', config: { ...client, health: 'down' } }],
      edges: [],
    });
    engine.processRequest(createSimRequest('client', 1, 'failure', 2));
    const metrics = engine.getMetricsSnapshot();
    expect(metrics.totalRequestsSuccess).toBe(1);
    expect(metrics.totalRequestsFailed).toBe(1);
    expect(metrics.p50LatencyMs).toBe(2);
    expect(metrics.successfulAvgLatencyMs).toBe(2);
    expect(metrics.failedAvgLatencyMs).toBe(1);
    expect(metrics.failedAvgLatencyMs).not.toBe(metrics.successfulAvgLatencyMs);
  });
});
