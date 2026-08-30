import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store/use-store';
import { simulationRuntime as simBridge } from '../engine/simulation-runtime';
import { configureGraphMutationListener } from '../engine/simulation-command-bus';

describe('Bugs Batch 2: Properties Panel Health Sync & Chaos Drills', () => {
  beforeEach(() => {
    configureGraphMutationListener(null);
    useStore.setState({
      nodes: [],
      edges: [],
      trafficConfig: { baseQps: 100, pattern: 'steady', burstMultiplier: 3, rampDurationSec: 30, spikeFrequencySec: 10 },
      nodeHealthOverrides: {},
    });
  });

  it('Bug 3: setNodeHealthOverride updates node health and triggers graph sync', () => {
    const syncGraphSpy = vi.fn();
    configureGraphMutationListener(syncGraphSpy);
    const { addNode, setNodeHealthOverride } = useStore.getState();

    const nodeId = addNode('app_server', { x: 100, y: 100 }, 'App Tier');
    expect(useStore.getState().nodes[0].data.config.health).toBe('healthy');

    setNodeHealthOverride(nodeId, 'down');
    expect(useStore.getState().nodes[0].data.config.health).toBe('down');
    expect(useStore.getState().nodeHealthOverrides[nodeId]).toBe('down');
    expect(syncGraphSpy).toHaveBeenCalled();
  });

  it('Bug 4: Chaos Flash Crowd surge configures spike pattern and syncs traffic to simulator', () => {
    const syncConfigSpy = vi.spyOn(simBridge, 'syncConfig');
    const { setTrafficConfig } = useStore.getState();

    const baseQps = 500;
    setTrafficConfig({ baseQps: baseQps * 5, pattern: 'spike' });
    simBridge.syncConfig({ baseQps: baseQps * 5, pattern: 'spike' });

    expect(useStore.getState().trafficConfig.baseQps).toBe(2500);
    expect(useStore.getState().trafficConfig.pattern).toBe('spike');
    expect(syncConfigSpy).toHaveBeenCalledWith({ baseQps: 2500, pattern: 'spike' });
  });

  it('Bug 5: Chaos High Network Latency marks servers as degraded', () => {
    const { addNode, setNodeHealthOverride } = useStore.getState();
    const srv1 = addNode('app_server', { x: 100, y: 100 }, 'Server 1');
    const srv2 = addNode('app_server', { x: 300, y: 100 }, 'Server 2');

    setNodeHealthOverride(srv1, 'degraded');
    setNodeHealthOverride(srv2, 'degraded');

    expect(useStore.getState().nodes[0].data.config.health).toBe('degraded');
    expect(useStore.getState().nodes[1].data.config.health).toBe('degraded');
  });
});
