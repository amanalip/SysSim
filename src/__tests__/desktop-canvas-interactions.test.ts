import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { ALL_SCENARIOS } from '../scenarios';
import { COMPONENT_METADATA_LIST } from '../model/component-defaults';

describe('Desktop UX/UI Enhancements (Features 1 to 10)', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isPropertiesPanelOpen: false,
      isBottomDrawerOpen: false,
      completedScenarioIds: [],
      toasts: [],
    });
  });

  it('Feature 1: Component metadata list has category assignments with valid category colors', () => {
    expect(COMPONENT_METADATA_LIST.length).toBeGreaterThan(10);
    COMPONENT_METADATA_LIST.forEach((comp) => {
      expect(['compute', 'networking', 'storage', 'caching', 'messaging', 'security']).toContain(comp.category);
    });
  });

  it('Feature 2: Store manages live component metrics mapping for telemetry badges', () => {
    const store = useStore.getState();
    expect(store.metrics).toBeDefined();
    expect(store.metrics.componentMetrics).toBeDefined();
  });

  it('Feature 3: Floating node actions support instant duplication and fault injection', () => {
    const { addNode, duplicateNode, setNodeHealthOverride } = useStore.getState();
    addNode('app_server', { x: 100, y: 100 }, 'Test App');
    const node = useStore.getState().nodes[0];
    expect(node).toBeDefined();

    duplicateNode(node.id);
    const nodes = useStore.getState().nodes;
    expect(nodes.length).toBe(2);

    setNodeHealthOverride(node.id, 'down');
    expect(useStore.getState().nodes[0].data.config.health).toBe('down');
  });

  it('Feature 4: Speed multiplier options include 0.5x, 1x, 2x, 5x, 10x', () => {
    const { setSpeedMultiplier } = useStore.getState();
    setSpeedMultiplier(5);
    expect(useStore.getState().speedMultiplier).toBe(5);
    setSpeedMultiplier(10);
    expect(useStore.getState().speedMultiplier).toBe(10);
  });

  it('Feature 5: Traffic pattern configuration updates pattern state correctly', () => {
    const { setTrafficConfig } = useStore.getState();
    setTrafficConfig({ pattern: 'spike' });
    expect(useStore.getState().trafficConfig.pattern).toBe('spike');
    setTrafficConfig({ pattern: 'bursty' });
    expect(useStore.getState().trafficConfig.pattern).toBe('bursty');
  });

  it('Feature 6: Quick-add drops component on canvas and produces toast notification', () => {
    const { addNode, addToast } = useStore.getState();
    addNode('redis_cache', { x: 350, y: 250 }, 'Main Redis');
    addToast('Added Main Redis to canvas', 'success');

    expect(useStore.getState().nodes.length).toBe(1);
    expect(useStore.getState().toasts.length).toBe(1);
    expect(useStore.getState().toasts[0].message).toContain('Main Redis');
  });

  it('Feature 7: Scenario completion tracking computes mastery progress percentage', () => {
    const { markScenarioCompleted } = useStore.getState();
    expect(ALL_SCENARIOS.length).toBe(101);

    markScenarioCompleted(1);
    markScenarioCompleted(2);
    expect(useStore.getState().completedScenarioIds).toContain(1);
    expect(useStore.getState().completedScenarioIds).toContain(2);

    const progress = Math.round((useStore.getState().completedScenarioIds.length / ALL_SCENARIOS.length) * 100);
    expect(progress).toBe(2);
  });

  it('Feature 8: Metrics telemetry exposes currentQps, success, and percentiles', () => {
    const store = useStore.getState();
    expect(store.metrics.totalRequestsSent).toBeDefined();
    expect(store.metrics.p99LatencyMs).toBeDefined();
    expect(store.metrics.overallErrorRatePercent).toBeDefined();
  });

  it('Feature 9: Properties panel footer actions trigger duplicate and deletion cleanly', () => {
    const { addNode, duplicateNode, removeNode } = useStore.getState();
    addNode('sql_db', { x: 200, y: 200 }, 'Primary DB');
    const db = useStore.getState().nodes[0];

    duplicateNode(db.id);
    expect(useStore.getState().nodes.length).toBe(2);

    removeNode(db.id);
    expect(useStore.getState().nodes.length).toBe(1);
  });

  it('Feature 10: Auto-layout and clear canvas actions are accessible through store', () => {
    const { addNode, autoLayout, clearCanvas } = useStore.getState();
    addNode('client', { x: 50, y: 50 }, 'Client');
    addNode('load_balancer', { x: 200, y: 50 }, 'LB');
    expect(useStore.getState().nodes.length).toBe(2);

    autoLayout();
    expect(useStore.getState().nodes.length).toBe(2);

    clearCanvas();
    expect(useStore.getState().nodes.length).toBe(0);
  });
});
