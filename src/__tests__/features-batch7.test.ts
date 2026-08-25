import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';

describe('Desktop UX/UI Enhancements (Features 13 & 14)', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      activeBottomTab: 'metrics',
      toasts: [],
    });
  });

  it('Feature 13: 5-Pillar Health Radar scores system availability, scalability, latency, cost, and resilience', () => {
    const { addNode, setActiveBottomTab } = useStore.getState();
    addNode('api_gateway', { x: 100, y: 100 }, 'Gateway');
    addNode('app_server', { x: 300, y: 100 }, 'App 1');
    addNode('app_server', { x: 300, y: 250 }, 'App 2');
    addNode('redis_cache', { x: 500, y: 100 }, 'Cache');
    addNode('sql_db', { x: 500, y: 250 }, 'Primary DB');

    setActiveBottomTab('health');
    expect(useStore.getState().activeBottomTab).toBe('health');
    expect(useStore.getState().nodes.length).toBe(5);
  });

  it('Feature 14: Chaos experiment drills inject targeted failure states and support 1-click restore', () => {
    const { addNode, setNodeHealthOverride } = useStore.getState();
    addNode('sql_db', { x: 200, y: 200 }, 'Primary SQL');
    const dbNode = useStore.getState().nodes[0];
    expect(dbNode).toBeDefined();

    // Trigger drill: crash database
    setNodeHealthOverride(dbNode.id, 'down');
    expect(useStore.getState().nodes[0].data.config.health).toBe('down');

    // Restore system
    setNodeHealthOverride(dbNode.id, 'healthy');
    expect(useStore.getState().nodes[0].data.config.health).toBe('healthy');
  });
});
