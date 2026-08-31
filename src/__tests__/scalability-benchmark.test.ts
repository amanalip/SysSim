import { describe, expect, it } from 'vitest';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { SIMULATION_LIMITS } from '../engine/simulation-limits';
import { createDefaultConfig } from '../model/component-defaults';

const traffic = (baseQps: number) => ({
  pattern: 'steady' as const,
  baseQps,
  burstMultiplier: 1,
  rampDurationSec: 1,
  spikeFrequencySec: 1,
  seed: 42,
});

function clientGraph(nodeCount: number, edgeCount = 0): SimGraph {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `client-${index}`,
    config: {
      ...createDefaultConfig('client', `client-${index}`),
      requestRateQps: 1,
    },
  }));
  const edges = Array.from({ length: edgeCount }, (_, index) => ({
    id: `edge-${index}`,
    source: nodes[index % nodes.length].id,
    target: nodes[(index * 7 + 1) % nodes.length].id,
    data: { protocol: 'HTTP' as const, purpose: 'observability' as const },
  }));
  return { nodes, edges };
}

function measureStep(graph: SimGraph, baseQps: number) {
  const engine = new SysSimEngine(graph, traffic(baseQps));
  engine.start();
  const started = performance.now();
  const result = engine.step(100);
  return { durationMs: performance.now() - started, result };
}

describe('scalability and transport benchmarks for tasks 488 and 491-495', () => {
  it.each([10, 100, 500, SIMULATION_LIMITS.maxNodes])(
    'profiles graph initialization and a tick with %i nodes',
    (nodeCount) => {
      const started = performance.now();
      const graph = clientGraph(nodeCount, Math.min(SIMULATION_LIMITS.maxEdges, nodeCount * 2));
      const constructionMs = performance.now() - started;
      const { durationMs } = measureStep(graph, 500);
      expect(constructionMs).toBeLessThan(2_000);
      expect(durationMs).toBeLessThan(5_000);
    },
  );

  it.each([
    ['minimum', 1],
    ['typical', 500],
    ['maximum', SIMULATION_LIMITS.maxConfiguredQps],
  ] as const)('benchmarks %s configured load (%i QPS)', (_label, qps) => {
    const { durationMs, result } = measureStep(clientGraph(10), qps);
    expect(result.metrics.totalRequestsOffered).toBe(Math.floor(qps / 10));
    expect(durationMs).toBeLessThan(5_000);
  });

  it('indexes the supported maximum graph and dense edge set within a bounded time', () => {
    const graph = clientGraph(SIMULATION_LIMITS.maxNodes, SIMULATION_LIMITS.maxEdges);
    const started = performance.now();
    const engine = new SysSimEngine(graph, traffic(100));
    const initializationMs = performance.now() - started;
    expect(initializationMs).toBeLessThan(2_000);
    expect(engine.getMetricsSnapshot().componentMetrics).toHaveProperty('client-0');
  });

  it('benchmarks a long-running simulation without unbounded retained state or heap growth', () => {
    const engine = new SysSimEngine(clientGraph(25), traffic(1_000));
    engine.start();
    const heapBefore = process.memoryUsage().heapUsed;
    for (let tick = 0; tick < 300; tick++) engine.step(100);
    const result = engine.step(100);
    const heapGrowthBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
    expect(result.recentRequests.length).toBeLessThanOrEqual(SIMULATION_LIMITS.maxRecentRequests);
    expect(result.metrics.timeSeries.length).toBeLessThanOrEqual(
      SIMULATION_LIMITS.maxTimeSeriesPoints,
    );
    expect(heapGrowthBytes).toBeLessThan(150_000_000);
  });

  it('benchmarks high fanout and bounded queue depth', () => {
    const client = { id: 'client', config: createDefaultConfig('client', 'client') };
    const queue = {
      id: 'queue',
      config: { ...createDefaultConfig('message_queue', 'queue'), maxDepth: 50 },
    };
    const workers = Array.from({ length: 25 }, (_, index) => ({
      id: `worker-${index}`,
      config: createDefaultConfig('worker', `worker-${index}`),
    }));
    const graph: SimGraph = {
      nodes: [client, queue, ...workers],
      edges: [
        { id: 'client-queue', source: 'client', target: 'queue', data: { protocol: 'HTTP' } },
        ...workers.map((worker, index) => ({
          id: `fanout-${index}`,
          source: 'queue',
          target: worker.id,
          data: { protocol: 'pub/sub' as const, purpose: 'fanout' as const },
        })),
      ],
    };
    const { durationMs, result } = measureStep(graph, 5_000);
    expect(durationMs).toBeLessThan(5_000);
    expect(result.metrics.componentMetrics.queue?.queueDepth).toBeLessThanOrEqual(50);
  });

  it('measures structured-clone overhead and message size for a maximum retained tick', () => {
    const { result } = measureStep(clientGraph(SIMULATION_LIMITS.maxNodes), 5_000);
    const payload = { ...result, graphRevision: 1 };
    const serializedBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
    const started = performance.now();
    const clone = structuredClone(payload);
    const cloneDurationMs = performance.now() - started;
    expect(clone.metrics.totalRequestsSent).toBe(payload.metrics.totalRequestsSent);
    expect(serializedBytes).toBeLessThan(5_000_000);
    expect(cloneDurationMs).toBeLessThan(1_000);
  });
});
