import { describe, expect, it } from 'vitest';
import { SysSimEngine, type SimGraph } from '../engine/simulator';
import { SIMULATION_LIMITS } from '../engine/simulation-limits';
import { createDefaultConfig } from '../model/component-defaults';
import {
  getRuntimePerformanceSnapshot,
  recordWorkerPerformance,
} from '../diagnostics/runtime-performance';
import { removeGraphItemsPure, updateNodePositionPure } from '../store/graph-operations';
import { toCanvasEdges, toCanvasNodes } from '../model/canvas-types';
import { clampStepDelta } from '../engine/runtime-guards';

const createGraph = (requestedNodes = 100): SimGraph => {
  const nodes = Array.from({ length: requestedNodes }, (_, index) => ({
    id: `node-${index}`,
    config: createDefaultConfig(index === 0 ? 'client' : 'app_server', `node-${index}`),
  }));
  const edges = Array.from({ length: Math.max(0, requestedNodes - 1) }, (_, index) => ({
    id: `edge-${index}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
    data: { protocol: 'HTTP' as const, purpose: 'request' as const },
  }));
  return { nodes, edges };
};

describe('runtime performance and responsiveness budgets', () => {
  it('records bounded worker CPU and message-size diagnostics', () => {
    recordWorkerPerformance(4.25, 18_432);
    expect(getRuntimePerformanceSnapshot()).toMatchObject({
      workerStepCpuMs: 4.25,
      workerMessageBytes: 18_432,
    });
  });

  it('clamps graphs, QPS, speed, and extreme step deltas at the engine boundary', () => {
    const engine = new SysSimEngine(createGraph(500));
    engine.setConfig({ baseQps: Number.MAX_VALUE, burstMultiplier: Number.POSITIVE_INFINITY });
    engine.setSpeedMultiplier(Number.MAX_VALUE);
    engine.start();
    const result = engine.step(0);
    expect(engine.getCurrentQps(0)).toBeLessThanOrEqual(SIMULATION_LIMITS.maxConfiguredQps);
    expect(clampStepDelta(Number.MAX_VALUE)).toBe(SIMULATION_LIMITS.maxStepDeltaMs);
    expect(
      result.metrics.componentMetrics && Object.keys(result.metrics.componentMetrics),
    ).toHaveLength(SIMULATION_LIMITS.maxNodes);
    expect(engine.getPendingEventCount()).toBeLessThanOrEqual(SIMULATION_LIMITS.maxScheduledEvents);
  });

  it('keeps pause, reset, and graph edits responsive under maximum supported load', () => {
    const graph = createGraph(SIMULATION_LIMITS.maxNodes);
    const loadGraph: SimGraph = {
      nodes: graph.nodes.map((node) => ({
        ...node,
        config: createDefaultConfig('client', node.id),
      })),
      edges: [],
    };
    const engine = new SysSimEngine(loadGraph, {
      pattern: 'steady',
      baseQps: SIMULATION_LIMITS.maxConfiguredQps,
      burstMultiplier: 3,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
      seed: 9,
    });
    engine.start();
    engine.step(100);
    const startedAt = performance.now();
    engine.pause();
    engine.setGraph({ nodes: loadGraph.nodes.slice(0, 80), edges: [] });
    engine.reset();
    expect(performance.now() - startedAt).toBeLessThan(250);
    expect(engine.getState()).toBe('idle');
    expect(engine.getPendingEventCount()).toBe(0);
  });

  it('keeps pure graph move and removal interactions below a regression budget', () => {
    const graph = createGraph(SIMULATION_LIMITS.maxNodes);
    const nodes = toCanvasNodes(
      graph.nodes.map((node, index) => ({
        id: node.id,
        type: 'customComponent',
        position: { x: index * 10, y: index * 5 },
        data: { config: node.config },
      })),
    );
    const edges = toCanvasEdges(graph.edges);
    const startedAt = performance.now();
    const moved = updateNodePositionPure(nodes, nodes[0].id, { x: 16, y: 16 });
    const removed = removeGraphItemsPure(moved, edges, [nodes[50].id], []);
    expect(performance.now() - startedAt).toBeLessThan(25);
    expect(removed.nodes).toHaveLength(99);
    expect(removed.edges.length).toBeLessThan(edges.length);
  });
});
