import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, CanvasNode, CanvasEdge } from '../store/use-store';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';

describe('Deep Audit Pass 9 Bug Fixes & Feature Tests (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. verifies detectBottlenecks catches single point of failure on un-replicated servers', () => {
    const nodeA = {
      id: 'node-client',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: {
        config: {
          id: 'node-client',
          name: 'Clients',
          type: 'client',
        },
      },
    } as unknown as CanvasNode;

    const nodeB = {
      id: 'node-server',
      type: 'customComponent',
      position: { x: 200, y: 0 },
      data: {
        config: {
          id: 'node-server',
          name: 'Single App Server',
          type: 'app_server',
          replicas: 1,
        },
      },
    } as unknown as CanvasNode;

    const edges: CanvasEdge[] = [
      {
        id: 'edge-1',
        source: 'node-client',
        target: 'node-server',
        data: { protocol: 'HTTP', latencyMs: 5 },
      },
    ];

    const issues = detectBottlenecks([nodeA, nodeB], edges, useStore.getState().metrics);
    const spof = issues.find((i) => i.id.includes('spof'));
    expect(spof).toBeDefined();
    expect(spof?.severity).toBe('warning');
  });

  it('2. verifies detectBottlenecks detects capacity overload when QPS exceeds 90% limit', () => {
    const serverNode = {
      id: 'node-server',
      type: 'customComponent',
      position: { x: 100, y: 100 },
      data: {
        config: {
          id: 'node-server',
          name: 'App Server',
          type: 'app_server',
          maxThroughputQps: 1000,
        },
      },
    } as unknown as CanvasNode;

    const metrics = {
      ...useStore.getState().metrics,
      componentMetrics: {
        'node-server': {
          nodeId: 'node-server',
          nodeName: 'App Server',
          nodeType: 'app_server' as const,
          totalRequests: 5000,
          successfulRequests: 5000,
          failedRequests: 0,
          qps: 950,
          avgLatencyMs: 20,
          p95LatencyMs: 30,
          p99LatencyMs: 40,
          errorRatePercent: 0,
          queueDepth: 0,
          cacheHitRatioPercent: 0,
          activeConnections: 10,
          utilizationPercent: 95,
        },
      },
    };

    const issues = detectBottlenecks([serverNode], [], metrics);
    const overload = issues.find((i) => i.id.includes('overload'));
    expect(overload).toBeDefined();
    expect(overload?.severity).toBe('critical');
  });

  it('3. verifies detectBottlenecks detects high error rate threshold', () => {
    const dbNode = {
      id: 'node-db',
      type: 'customComponent',
      position: { x: 200, y: 200 },
      data: {
        config: {
          id: 'node-db',
          name: 'Primary SQL DB',
          type: 'sql_db',
        },
      },
    } as unknown as CanvasNode;

    const metrics = {
      ...useStore.getState().metrics,
      componentMetrics: {
        'node-db': {
          nodeId: 'node-db',
          nodeName: 'Primary SQL DB',
          nodeType: 'sql_db' as const,
          totalRequests: 5000,
          successfulRequests: 3750,
          failedRequests: 1250,
          qps: 200,
          avgLatencyMs: 15,
          p95LatencyMs: 25,
          p99LatencyMs: 35,
          errorRatePercent: 25,
          queueDepth: 0,
          cacheHitRatioPercent: 0,
          activeConnections: 10,
          utilizationPercent: 50,
        },
      },
    };

    const issues = detectBottlenecks([dbNode], [], metrics);
    const highError = issues.find((i) => i.id.includes('high_error'));
    expect(highError).toBeDefined();
    expect(highError?.severity).toBe('critical');
  });

  it('4. verifies detectBottlenecks flags missing cache layer on direct DB access', () => {
    const clientNode = {
      id: 'node-client',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: {
        config: {
          id: 'node-client',
          name: 'Client',
          type: 'client',
        },
      },
    } as unknown as CanvasNode;

    const dbNode = {
      id: 'node-db',
      type: 'customComponent',
      position: { x: 200, y: 0 },
      data: {
        config: {
          id: 'node-db',
          name: 'SQL DB',
          type: 'sql_db',
        },
      },
    } as unknown as CanvasNode;

    const edges: CanvasEdge[] = [
      {
        id: 'edge-direct',
        source: 'node-client',
        target: 'node-db',
        data: { protocol: 'HTTP', latencyMs: 5 },
      },
    ];

    const issues = detectBottlenecks([clientNode, dbNode], edges, useStore.getState().metrics);
    const missingCache = issues.find((i) => i.id.includes('missing_cache'));
    expect(missingCache).toBeDefined();
    expect(missingCache?.severity).toBe('warning');
  });

  it('5. verifies selectNode sets selectedNodeId in state', () => {
    const nodeId = useStore.getState().addNode('app_server', { x: 50, y: 50 });
    useStore.getState().selectNode(nodeId);

    expect(useStore.getState().selectedNodeId).toBe(nodeId);
    expect(useStore.getState().selectedEdgeId).toBeNull();
  });

  it('6. verifies selectEdge sets selectedEdgeId in state', () => {
    const nodeA = useStore.getState().addNode('client', { x: 0, y: 0 });
    const nodeB = useStore.getState().addNode('app_server', { x: 100, y: 0 });
    useStore.getState().addEdge(nodeA, nodeB, 'HTTP');
    const edgeId = useStore.getState().edges[0].id;

    useStore.getState().selectEdge(edgeId);
    expect(useStore.getState().selectedEdgeId).toBe(edgeId);
    expect(useStore.getState().selectedNodeId).toBeNull();
  });

  it('7. verifies selectNode(null) clears selectedNodeId', () => {
    const nodeId = useStore.getState().addNode('app_server', { x: 50, y: 50 });
    useStore.getState().selectNode(nodeId);
    expect(useStore.getState().selectedNodeId).toBe(nodeId);

    useStore.getState().selectNode(null);
    expect(useStore.getState().selectedNodeId).toBeNull();
  });

  it('8. verifies clearCanvas empties nodes, edges, and zones', () => {
    const nodeA = useStore.getState().addNode('client', { x: 0, y: 0 });
    const nodeB = useStore.getState().addNode('app_server', { x: 100, y: 0 });
    useStore.getState().addEdge(nodeA, nodeB, 'gRPC');
    useStore
      .getState()
      .addZone('Private VPC Network', 'private', { x: 0, y: 0, width: 400, height: 300 });

    expect(useStore.getState().nodes.length).toBe(2);
    expect(useStore.getState().edges.length).toBe(1);
    expect(useStore.getState().zones.length).toBe(1);

    useStore.getState().clearCanvas();
    expect(useStore.getState().nodes.length).toBe(0);
    expect(useStore.getState().edges.length).toBe(0);
    expect(useStore.getState().zones.length).toBe(0);
  });

  it('9. verifies setChaosMode updates isChaosMode and chaosIntervalSec', () => {
    expect(useStore.getState().isChaosMode).toBe(false);

    useStore.getState().setChaosMode(true, 20);
    expect(useStore.getState().isChaosMode).toBe(true);
    expect(useStore.getState().chaosIntervalSec).toBe(20);

    useStore.getState().setChaosMode(false);
    expect(useStore.getState().isChaosMode).toBe(false);
  });

  it('10. verifies detectBottlenecks detects synchronous chaining across 5 nodes', () => {
    const nodes = [
      {
        id: '1',
        type: 'customComponent',
        position: { x: 0, y: 0 },
        data: { config: { id: '1', name: 'Gateway', type: 'api_gateway' } },
      },
      {
        id: '2',
        type: 'customComponent',
        position: { x: 50, y: 0 },
        data: { config: { id: '2', name: 'Auth', type: 'app_server' } },
      },
      {
        id: '3',
        type: 'customComponent',
        position: { x: 100, y: 0 },
        data: { config: { id: '3', name: 'Core', type: 'app_server' } },
      },
      {
        id: '4',
        type: 'customComponent',
        position: { x: 150, y: 0 },
        data: { config: { id: '4', name: 'Payment', type: 'app_server' } },
      },
      {
        id: '5',
        type: 'customComponent',
        position: { x: 200, y: 0 },
        data: { config: { id: '5', name: 'DB', type: 'sql_db' } },
      },
    ] as unknown as CanvasNode[];

    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2', data: { protocol: 'HTTP', latencyMs: 5 } },
      { id: 'e2', source: '2', target: '3', data: { protocol: 'HTTP', latencyMs: 5 } },
      { id: 'e3', source: '3', target: '4', data: { protocol: 'HTTP', latencyMs: 5 } },
      { id: 'e4', source: '4', target: '5', data: { protocol: 'HTTP', latencyMs: 5 } },
    ];

    const issues = detectBottlenecks(nodes, edges);
    const syncChain = issues.find((i) => i.id.includes('sync_chain'));
    expect(syncChain).toBeDefined();
    expect(syncChain?.severity).toBe('warning');
  });
});
