import { describe, expect, it } from 'vitest';
import { canvasEdgeFixture, canvasNodeFixture } from '../test/builders';
import {
  cloneGraphState,
  removeGraphItemsPure,
  updateNodePositionPure,
} from '../store/graph-operations';
import { selectGraphCounts, selectSimulationSummary } from '../store/selectors';
import {
  createInitialCalculatorInputs,
  createInitialMetrics,
  createInitialTrafficConfig,
} from '../store/slices/initial-state';
import { useStore } from '../store/use-store';

describe('store slice boundaries', () => {
  it('keeps pure graph operations immutable and removes incident edges', () => {
    const first = canvasNodeFixture('client', 'first');
    const second = canvasNodeFixture('app_server', 'second');
    const edge = canvasEdgeFixture(first.id, second.id);
    const snapshot = cloneGraphState([first, second], [edge], []);
    const removed = removeGraphItemsPure(snapshot.nodes, snapshot.edges, [first.id], []);
    expect(removed.nodes.map((node) => node.id)).toEqual(['second']);
    expect(removed.edges).toEqual([]);
    expect(snapshot.nodes).toHaveLength(2);
    expect(updateNodePositionPure(snapshot.nodes, second.id, { x: 9, y: 8 })[1].position).toEqual({
      x: 9,
      y: 8,
    });
  });

  it('returns fresh reset objects instead of shared mutable state', () => {
    const firstMetrics = createInitialMetrics();
    const secondMetrics = createInitialMetrics();
    firstMetrics.timeSeries.push({
      timestampSec: 1,
      p50LatencyMs: 1,
      p95LatencyMs: 1,
      p99LatencyMs: 1,
      throughputQps: 1,
      errorRatePercent: 0,
      cacheHitRatioPercent: 0,
      activeRequests: 0,
    });
    expect(secondMetrics.timeSeries).toEqual([]);
    expect(createInitialTrafficConfig()).not.toBe(createInitialTrafficConfig());
    expect(createInitialCalculatorInputs()).not.toBe(createInitialCalculatorInputs());
  });

  it('provides typed, domain-focused selectors', () => {
    const state = useStore.getState();
    expect(selectGraphCounts(state)).toEqual({
      nodeCount: state.nodes.length,
      edgeCount: state.edges.length,
    });
    expect(selectSimulationSummary(state)).toMatchObject({
      simState: state.simState,
      runtimeMode: state.simulationRuntimeMode,
    });
  });
});
