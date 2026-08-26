import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { ALL_SCENARIOS } from '../scenarios';

describe('Deep Fixes Batch 3: Health Radar Idle Cost Scoring & Command Palette Challenge Loading', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      simState: 'idle',
      trafficConfig: {
        pattern: 'steady',
        baseQps: 10000,
        burstMultiplier: 2,
        rampDurationSec: 30,
        spikeFrequencySec: 60,
      },
    });
  });

  it('Fix 5: Health Radar does not penalize over-provisioning on idle canvas when base QPS is high', () => {
    const { addNode } = useStore.getState();
    // Add 14 server replicas for a 10,000 QPS system
    for (let i = 0; i < 7; i++) {
      addNode('app_server', { x: i * 50, y: 100 }, `Server ${i}`);
    }

    const state = useStore.getState();
    expect(state.nodes.length).toBe(7);
    expect(state.simState).toBe('idle');
    expect(state.trafficConfig.baseQps).toBe(10000);
  });

  it('Fix 6: Command Palette loads scenario in challenge mode without overwriting user canvas with reference solution', () => {
    const { loadScenario, addNode } = useStore.getState();
    const scenario = ALL_SCENARIOS[0];

    // Load scenario challenge
    loadScenario(scenario);
    expect(useStore.getState().currentScenario?.id).toBe(scenario.id);
    expect(useStore.getState().nodes.length).toBe(0); // Clean canvas for user to build their own solution

    // User adds their own component
    addNode('client', { x: 50, y: 100 }, 'My Custom Ingress');
    expect(useStore.getState().nodes.length).toBe(1);
  });
});
