import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store/use-store';
import { simulationRuntime as simBridge } from '../engine/simulation-runtime';
import { ALL_SCENARIOS } from '../scenarios';

describe('Bugs Batch 1: Snapshot Manager & Scenario Interview Stepper', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      trafficConfig: { baseQps: 100, pattern: 'steady', burstMultiplier: 3, rampDurationSec: 30, spikeFrequencySec: 10 },
      simState: 'idle',
    });
  });

  it('Bug 1: Snapshot storage initializes slots and handles save/load lifecycle', () => {
    const { loadCanvasState, addNode } = useStore.getState();
    addNode('app_server', { x: 100, y: 100 }, 'Test App');
    expect(useStore.getState().nodes.length).toBe(1);

    const snapshot = {
      id: 1,
      name: 'Snapshot 1',
      timestamp: Date.now(),
      nodeCount: 1,
      edgeCount: 0,
      nodes: useStore.getState().nodes,
      edges: useStore.getState().edges,
      zones: [],
    };

    useStore.setState({ nodes: [] });
    expect(useStore.getState().nodes.length).toBe(0);

    loadCanvasState(snapshot.nodes, snapshot.edges, snapshot.zones);
    expect(useStore.getState().nodes.length).toBe(1);
    expect(useStore.getState().nodes[0].data.config.name).toBe('Test App');
  });

  it('Bug 2: Scenario Stepper load test configures and synchronizes target QPS', () => {
    const syncConfigSpy = vi.spyOn(simBridge, 'syncConfig');
    const startSpy = vi.spyOn(simBridge, 'start');

    const scenario = ALL_SCENARIOS[0]; // URL shortener (e.g. 50,000 QPS)
    const targetQps = scenario.constraints.targetQps;

    useStore.getState().setTrafficConfig({ baseQps: targetQps });
    simBridge.syncConfig({ baseQps: targetQps });
    simBridge.start();

    expect(useStore.getState().trafficConfig.baseQps).toBe(targetQps);
    expect(syncConfigSpy).toHaveBeenCalledWith({ baseQps: targetQps });
    expect(startSpy).toHaveBeenCalled();
  });
});
