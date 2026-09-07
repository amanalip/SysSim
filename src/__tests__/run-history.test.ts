import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  beginRun,
  cancelRun,
  finishRun,
  comparisonWarnings,
  useRunHistory,
} from '../store/run-history';
import { useStore } from '../store/use-store';
import { createInitialMetrics } from '../store/slices/initial-state';

describe('saved simulation experiments', () => {
  beforeEach(() => {
    useRunHistory.getState().clear();
    useStore.setState({
      metrics: createInitialMetrics(),
      simulationElapsedMs: 0,
      nodes: [],
      edges: [],
      isChaosMode: false,
    });
  });
  afterEach(cancelRun);
  function completedRun() {
    beginRun();
    useStore.getState().updateMetrics({
      totalRequestsCompleted: 90,
      totalRequestsSuccess: 80,
      totalRequestsDropped: 10,
      p95LatencyMs: 25,
    });
    useStore.getState().setSimulationTiming(2000, Date.now());
    finishRun();
    return useRunHistory.getState().runs[0];
  }
  it('retains immutable summaries after live metrics and workload change', () => {
    const run = completedRun();
    useStore.getState().updateMetrics({ totalRequestsCompleted: 999 });
    useStore.getState().setTrafficConfig({ baseQps: run.traffic.baseQps + 1 });
    expect(run.completed).toBe(90);
    expect(run.throughput).toBe(45);
    expect(run.traffic.baseQps).not.toBe(useStore.getState().trafficConfig.baseQps);
    finishRun();
    expect(useRunHistory.getState().runs).toHaveLength(1);
  });
  it('does not save a zero-duration or cancelled experiment', () => {
    beginRun();
    finishRun();
    beginRun();
    cancelRun();
    finishRun();
    expect(useRunHistory.getState().runs).toHaveLength(0);
  });
  it('bounds history and preserves a pinned baseline', () => {
    const first = completedRun();
    useRunHistory.getState().pinBaseline(first.id);
    for (let index = 0; index < 12; index++) completedRun();
    const { runs } = useRunHistory.getState();
    expect(runs).toHaveLength(10);
    expect(runs).toContain(first);
  });
  it('warns about workload, duration, low samples, and changes even when reverted', () => {
    const first = completedRun();
    beginRun();
    const qps = useStore.getState().trafficConfig.baseQps;
    useStore.getState().setTrafficConfig({ baseQps: qps + 10 });
    useStore.getState().setTrafficConfig({ baseQps: qps });
    useStore.getState().setSimulationTiming(3000, Date.now());
    finishRun();
    const second = useRunHistory.getState().runs[0];
    expect(second.changedDuringRun).toBe(true);
    expect(comparisonWarnings(first, second).join(' ')).toContain('durations differ');
    expect(
      comparisonWarnings(first, {
        ...second,
        succeeded: 0,
        traffic: { ...second.traffic, seed: 200 },
      }).join(' '),
    ).toContain('Workload or seed differs');
    expect(comparisonWarnings(first, { ...second, succeeded: 0 }).join(' ')).toContain('Too few');
    expect(comparisonWarnings(first, first)).toEqual([]);
  });
});
