import { describe, expect, it } from 'vitest';
import { AppServerModel } from '../engine/components/app-server-model';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import { ClientConfig } from '../model/types';

const client = (id: string, overrides: Partial<ClientConfig>): ClientConfig => ({
  ...(createDefaultConfig('client', id, id) as ClientConfig),
  ...overrides,
});

describe('client traffic inputs', () => {
  it('treats global QPS as total offered load and client rates as deterministic weights', () => {
    const graph: SimGraph = {
      nodes: [
        { id: 'small', config: client('small', { requestRateQps: 100 }) },
        { id: 'large', config: client('large', { requestRateQps: 300 }) },
      ],
      edges: [],
    };
    const engine = new SysSimEngine(graph, {
      pattern: 'steady', baseQps: 40, burstMultiplier: 1, rampDurationSec: 1,
      spikeFrequencySec: 1, seed: 4,
    });
    engine.start();
    engine.step(1000);
    const metrics = engine.getMetricsSnapshot();
    expect(metrics.totalRequestsSent).toBe(40);
    expect(metrics.componentMetrics.small.totalRequests).toBe(10);
    expect(metrics.componentMetrics.large.totalRequests).toBe(30);
  });

  it('propagates connection, payload, operation, and per-client key-distribution inputs', () => {
    const graph: SimGraph = {
      nodes: [{ id: 'client', config: client('client', {
        connectionType: 'HTTP/3', requestPayloadKb: 12, operationType: 'write',
        requestKeyDistribution: 'uniform', requestKeySpaceSize: 1,
      }) }],
      edges: [],
    };
    const engine = new SysSimEngine(graph, {
      pattern: 'steady', baseQps: 1, burstMultiplier: 1, rampDurationSec: 1,
      spikeFrequencySec: 1, seed: 5,
    });
    engine.start();
    const { activeRequests, recentRequests } = engine.step(1000);
    expect(activeRequests).toHaveLength(0);
    expect(recentRequests).toHaveLength(1);
    expect(recentRequests[0]).toMatchObject({ requestKey: 'resource:0', payloadSizeKb: 12, operationType: 'write' });
    expect(recentRequests[0].path[0].info).toContain('HTTP/3; write; 12 KB payload');
    expect(recentRequests[0].path[0].latencyMs).toBeCloseTo(1.12);
  });
});

describe('application server capacity model', () => {
  it('adds replica capacity without reducing intrinsic processing latency', () => {
    const oneReplica = new AppServerModel(1, 20, 1000);
    const twoReplicas = new AppServerModel(2, 20, 1000);
    const one = [oneReplica.process(0), oneReplica.process(0)];
    const two = [twoReplicas.process(0), twoReplicas.process(0)];

    expect(one[0]).toMatchObject({ processingLatencyMs: 20, queueLatencyMs: 0, totalLatencyMs: 20 });
    expect(one[1]).toMatchObject({ processingLatencyMs: 20, queueLatencyMs: 20, totalLatencyMs: 40 });
    expect(two.map((result) => result.processingLatencyMs)).toEqual([20, 20]);
    expect(two.map((result) => result.queueLatencyMs)).toEqual([0, 0]);
  });

  it('enforces per-replica connection slots and exposes queue/load telemetry', () => {
    const server = new AppServerModel(1, 20, 1000, 2);
    const results = [server.process(0), server.process(0), server.process(0)];
    expect(results.map((result) => result.queueLatencyMs)).toEqual([0, 1, 20]);
    expect(results[2].queuedRequests).toBeGreaterThan(0);
    expect(results[2].cpuUtilizationPercent).toBeGreaterThan(0);

    const scaled = new AppServerModel(2, 20, 1000, 2);
    expect(Array.from({ length: 4 }, () => scaled.process(0).queueLatencyMs)).toEqual([0, 0, 1, 1]);
    expect(scaled.process(0).processingLatencyMs).toBe(20);
  });

  it('defines degraded service as half replica capacity and doubled intrinsic latency', () => {
    const degraded = new AppServerModel(4, 20, 1000, 1, true);
    const results = [degraded.process(0), degraded.process(0), degraded.process(0)];
    expect(results[0]).toMatchObject({ processingLatencyMs: 40, degraded: true, queueLatencyMs: 0 });
    expect(results[1].queueLatencyMs).toBe(0);
    expect(results[2].queueLatencyMs).toBe(40);
  });
});
