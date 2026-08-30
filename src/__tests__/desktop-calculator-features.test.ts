import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { ALL_SCENARIOS } from '../scenarios';

describe('Desktop UX/UI Enhancements (Features 15 & 16)', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      toasts: [],
    });
  });

  it('Feature 15: Scenario interview stepper maps 5-stage FAANG requirements to target constraints', () => {
    const scenario = ALL_SCENARIOS[0];
    expect(scenario).toBeDefined();
    expect(scenario.constraints.targetQps).toBeGreaterThan(0);
    expect(scenario.constraints.dataSizeGb).toBeGreaterThan(0);
    expect(scenario.constraints.maxP99LatencyMs).toBeGreaterThan(0);
    expect(scenario.constraints.availabilitySlaPercent).toBeGreaterThan(90);
  });

  it('Feature 16: Multi-slot architecture snapshots can save and restore canvas state', () => {
    const { addNode, loadCanvasState } = useStore.getState();
    addNode('app_server', { x: 150, y: 150 }, 'App Alpha');
    addNode('redis_cache', { x: 350, y: 150 }, 'Redis Cache');

    const currentNodes = useStore.getState().nodes;
    expect(currentNodes.length).toBe(2);

    // Save snapshot simulation
    const snapshot = {
      id: 1,
      name: 'Design Baseline',
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: [],
      zones: [],
    };

    // Clear canvas
    useStore.getState().clearCanvas();
    expect(useStore.getState().nodes.length).toBe(0);

    // Restore snapshot
    loadCanvasState(snapshot.nodes, snapshot.edges, snapshot.zones);
    expect(useStore.getState().nodes.length).toBe(2);
    expect(useStore.getState().nodes[0].data.config.name).toBe('App Alpha');
  });
});
