import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { CanvasNode } from '../store/use-store';
import { createDefaultConfig } from '../model/component-defaults';

describe('Deep Audit Pass 4 Bug Fixes & Feature Tests (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. verifies updateNodeConfig updates maxThroughputQps accurately', () => {
    const nodeId = useStore.getState().addNode('app_server', { x: 100, y: 100 });
    useStore.getState().updateNodeConfig(nodeId, { maxThroughputQps: 15000 });

    const node = useStore.getState().nodes.find((n) => n.id === nodeId);
    expect(node?.data.config.maxThroughputQps).toBe(15000);
  });

  it('2. verifies setNodeHealthOverride updates node health status and override map', () => {
    const nodeId = useStore.getState().addNode('sql_db', { x: 100, y: 100 });
    useStore.getState().setNodeHealthOverride(nodeId, 'degraded');

    const node = useStore.getState().nodes.find((n) => n.id === nodeId);
    expect(node?.data.config.health).toBe('degraded');
    expect(useStore.getState().nodeHealthOverrides[nodeId]).toBe('degraded');
  });

  it('3. verifies updateNodeConfig updates replicas count safely', () => {
    const nodeId = useStore.getState().addNode('app_server', { x: 100, y: 100 });
    useStore.getState().updateNodeConfig(nodeId, { replicas: 8 });

    const node = useStore.getState().nodes.find((n) => n.id === nodeId);
    expect((node?.data.config as any).replicas).toBe(8);
  });

  it('4. verifies updateNodeConfig resets to factory defaults properly', () => {
    const nodeId = useStore.getState().addNode('redis_cache', { x: 100, y: 100 });
    useStore.getState().updateNodeConfig(nodeId, { hitRatioPercent: 40 });
    expect((useStore.getState().nodes[0].data.config as any).hitRatioPercent).toBe(40);

    const defaultConfig = createDefaultConfig('redis_cache', nodeId, 'Redis Cache');
    useStore.getState().updateNodeConfig(nodeId, defaultConfig);
    expect((useStore.getState().nodes[0].data.config as any).hitRatioPercent).toBe(80);
  });

  it('5. verifies detectBottlenecks identifies single point of failure on single database node with 0 read replicas', () => {
    const config = createDefaultConfig('sql_db', 'db_master', 'Master DB');
    (config as any).readReplicasCount = 0;

    const loneDb: CanvasNode = {
      id: 'db_master',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config },
    };

    const clientConfig = createDefaultConfig('client', 'client', 'Client');
    const client: CanvasNode = { id: 'client', type: 'customComponent', position: { x: -100, y: 0 }, data: { config: clientConfig } };
    const issues = detectBottlenecks([client, loneDb], [{ id: 'client-db', source: 'client', target: 'db_master', data: { protocol: 'HTTP', purpose: 'request' } }]);
    const spof = issues.find((i) => i.type === 'spof');
    expect(spof).toBeDefined();
    expect(spof?.nodeId).toBe('db_master');
  });

  it('6. verifies detectBottlenecks does not flag SPOF on distributed databases with multiple replicas', () => {
    const config = createDefaultConfig('sql_db', 'db_cluster', 'DB Cluster');
    (config as any).readReplicasCount = 3;

    const multiDb: CanvasNode = {
      id: 'db_cluster',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config },
    };

    const issues = detectBottlenecks([multiDb], []);
    const spof = issues.find((i) => i.nodeId === 'db_cluster' && i.type === 'spof');
    expect(spof).toBeUndefined();
  });

  it('7. verifies selectEdge clears node selection and selects target edge', () => {
    const nodeA = useStore.getState().addNode('client', { x: 0, y: 0 });
    const nodeB = useStore.getState().addNode('app_server', { x: 200, y: 0 });
    useStore.getState().addEdge(nodeA, nodeB);
    const edgeId = useStore.getState().edges[0].id;

    useStore.getState().selectNode(nodeA);
    expect(useStore.getState().selectedNodeId).toBe(nodeA);
    expect(useStore.getState().selectedEdgeId).toBeNull();

    useStore.getState().selectEdge(edgeId);
    expect(useStore.getState().selectedNodeId).toBeNull();
    expect(useStore.getState().selectedEdgeId).toBe(edgeId);
  });

  it('8. verifies pushHistory and undo restores previous canvas node count', () => {
    expect(useStore.getState().nodes.length).toBe(0);

    useStore.getState().addNode('client', { x: 0, y: 0 });
    expect(useStore.getState().nodes.length).toBe(1);

    useStore.getState().undo();
    expect(useStore.getState().nodes.length).toBe(0);
  });

  it('9. verifies toggleCutEdge toggles connection partition status', () => {
    const nodeA = useStore.getState().addNode('client', { x: 0, y: 0 });
    const nodeB = useStore.getState().addNode('app_server', { x: 200, y: 0 });
    useStore.getState().addEdge(nodeA, nodeB);
    const edgeId = useStore.getState().edges[0].id;

    const edgeBefore = useStore.getState().edges.find((e) => e.id === edgeId);
    expect(edgeBefore?.data?.isCut).toBeFalsy();

    useStore.getState().toggleCutEdge(edgeId);
    const edgeAfterCut = useStore.getState().edges.find((e) => e.id === edgeId);
    expect(edgeAfterCut?.data?.isCut).toBe(true);

    useStore.getState().toggleCutEdge(edgeId);
    const edgeRestored = useStore.getState().edges.find((e) => e.id === edgeId);
    expect(edgeRestored?.data?.isCut).toBe(false);
  });

  it('10. verifies updateEdgeProtocol changes transport protocol on canvas edge', () => {
    const nodeA = useStore.getState().addNode('client', { x: 0, y: 0 });
    const nodeB = useStore.getState().addNode('app_server', { x: 200, y: 0 });
    useStore.getState().addEdge(nodeA, nodeB, 'HTTP');
    const edgeId = useStore.getState().edges[0].id;

    expect(useStore.getState().edges[0].data?.protocol).toBe('HTTP');

    useStore.getState().updateEdgeProtocol(edgeId, 'gRPC');
    expect(useStore.getState().edges[0].data?.protocol).toBe('gRPC');
  });
});
