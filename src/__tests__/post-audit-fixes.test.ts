import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { SysSimEngine } from '../engine/simulator';
import { AnyComponentConfig } from '../model/types';

describe('Post-Audit Verified Bug Fixes & Day/Night Mode Contrast', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      historyPast: [],
      historyFuture: [],
      theme: 'light',
    });
  });

  it('Bug 1: removeNode and removeEdge delete elements and sync graph', () => {
    const { addNode, addEdge, removeNode, removeEdge } = useStore.getState();

    addNode('app_server', { x: 100, y: 100 }, 'App 1');
    addNode('sql_db', { x: 300, y: 100 }, 'DB 1');

    const appNodeId = useStore.getState().nodes[0].id;
    const dbNodeId = useStore.getState().nodes[1].id;

    addEdge(appNodeId, dbNodeId, 'HTTP');
    expect(useStore.getState().edges.length).toBe(1);

    const edgeId = useStore.getState().edges[0].id;
    removeEdge(edgeId);
    expect(useStore.getState().edges.length).toBe(0);

    removeNode(appNodeId);
    expect(useStore.getState().nodes.length).toBe(1);
    expect(useStore.getState().nodes[0].id).toBe(dbNodeId);
  });

  it('Bug 2: undo and redo restore graph state accurately without corrupting history stacks', () => {
    const { addNode, undo, redo } = useStore.getState();

    addNode('app_server', { x: 100, y: 100 }, 'App 1');
    expect(useStore.getState().nodes.length).toBe(1);

    addNode('redis_cache', { x: 300, y: 100 }, 'Redis 1');
    expect(useStore.getState().nodes.length).toBe(2);

    // Undo adding Redis
    undo();
    expect(useStore.getState().nodes.length).toBe(1);
    expect(useStore.getState().nodes[0].data.config.name).toBe('App 1');

    // Redo adding Redis
    redo();
    expect(useStore.getState().nodes.length).toBe(2);
    expect(useStore.getState().nodes[1].data.config.name).toBe('Redis 1');
  });

  it('Simulator engine purges dead node statistics when graph is updated', () => {
    const engine = new SysSimEngine({
      nodes: [
        { id: 'node_1', config: { id: 'node_1', name: 'Node 1', type: 'app_server' } as AnyComponentConfig },
        { id: 'node_2', config: { id: 'node_2', name: 'Node 2', type: 'sql_db' } as AnyComponentConfig },
      ],
      edges: [],
    });

    engine.step(100);
    const metricsBefore = engine.getMetricsSnapshot();
    expect(metricsBefore.componentMetrics['node_1']).toBeDefined();
    expect(metricsBefore.componentMetrics['node_2']).toBeDefined();

    // Update graph with node_2 removed
    engine.setGraph({
      nodes: [
        { id: 'node_1', config: { id: 'node_1', name: 'Node 1', type: 'app_server' } as AnyComponentConfig },
      ],
      edges: [],
    });

    const metricsAfter = engine.getMetricsSnapshot();
    expect(metricsAfter.componentMetrics['node_1']).toBeDefined();
    expect(metricsAfter.componentMetrics['node_2']).toBeUndefined();
  });
});
