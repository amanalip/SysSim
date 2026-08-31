import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { SysSimEngine } from '../engine/simulator';
import { CacheModel } from '../engine/components/cache-model';
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

  it('Bug 3: CacheModel reset clears cached entries and hit/miss counters', () => {
    const cache = new CacheModel(100, 'LRU', 100);
    cache.put('user_123');
    cache.put('user_456');
    cache.access('user_123');
    cache.access('user_456');
    expect(cache.getHitRatioPercent()).toBe(100);

    cache.reset();
    expect(cache.getHitRatioPercent()).toBe(0);
  });

  it('Bug 4: loadCanvasState loads nodes, edges, zones, and pushes history', () => {
    const { loadCanvasState } = useStore.getState();
    const mockNodes = [
      {
        id: 'imported_node_1',
        type: 'custom',
        position: { x: 200, y: 200 },
        data: {
          config: {
            id: 'imported_node_1',
            name: 'Imported App',
            type: 'app_server',
          } as AnyComponentConfig,
        },
      },
    ];

    loadCanvasState(mockNodes, [], []);
    expect(useStore.getState().nodes.length).toBe(1);
    expect(useStore.getState().nodes[0].data.config.name).toBe('Imported App');
  });

  it('Bug 5: updateNodeConfig and duplicateNode update configuration and clone properly', () => {
    const { addNode, updateNodeConfig, duplicateNode } = useStore.getState();

    const nodeId = addNode('app_server', { x: 100, y: 100 }, 'Original App');
    updateNodeConfig(nodeId, { maxThroughputQps: 12000 });

    expect(useStore.getState().nodes[0].data.config.maxThroughputQps).toBe(12000);

    const dupId = duplicateNode(nodeId);
    expect(dupId).toBeDefined();
    expect(useStore.getState().nodes.length).toBe(2);
    expect(useStore.getState().nodes[1].data.config.name).toContain('(Copy)');
  });

  it('Bug 6: updateEdgeProtocol and toggleCutEdge update edge metadata properly', () => {
    const { addNode, addEdge, updateEdgeProtocol, toggleCutEdge } = useStore.getState();

    const n1 = addNode('app_server', { x: 100, y: 100 }, 'A');
    const n2 = addNode('sql_db', { x: 300, y: 100 }, 'B');
    addEdge(n1, n2, 'HTTP');

    const edgeId = useStore.getState().edges[0].id;
    updateEdgeProtocol(edgeId, 'gRPC');
    expect(useStore.getState().edges[0].data?.protocol).toBe('gRPC');

    toggleCutEdge(edgeId);
    expect(useStore.getState().edges[0].data?.isCut).toBe(true);
  });

  it('Simulator engine purges dead node statistics and resets cache models on reset', () => {
    const engine = new SysSimEngine({
      nodes: [
        {
          id: 'node_1',
          config: { id: 'node_1', name: 'Node 1', type: 'app_server' } as AnyComponentConfig,
        },
        {
          id: 'node_2',
          config: { id: 'node_2', name: 'Node 2', type: 'sql_db' } as AnyComponentConfig,
        },
        {
          id: 'node_3',
          config: { id: 'node_3', name: 'Node 3', type: 'redis_cache' } as AnyComponentConfig,
        },
      ],
      edges: [],
    });

    engine.step(100);
    const metricsBefore = engine.getMetricsSnapshot();
    expect(metricsBefore.componentMetrics['node_1']).toBeDefined();
    expect(metricsBefore.componentMetrics['node_2']).toBeDefined();

    // Reset engine
    engine.reset();
    const metricsAfterReset = engine.getMetricsSnapshot();
    expect(metricsAfterReset.totalRequestsSent).toBe(0);

    // Update graph with node_2 removed
    engine.setGraph({
      nodes: [
        {
          id: 'node_1',
          config: { id: 'node_1', name: 'Node 1', type: 'app_server' } as AnyComponentConfig,
        },
      ],
      edges: [],
    });

    const metricsAfterGraphChange = engine.getMetricsSnapshot();
    expect(metricsAfterGraphChange.componentMetrics['node_1']).toBeDefined();
    expect(metricsAfterGraphChange.componentMetrics['node_2']).toBeUndefined();
  });
});
