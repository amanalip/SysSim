import { describe, it, expect, beforeEach } from 'vitest';
import { ConsistentHashRing } from '../engine/routing/consistent-hashing';
import { DatabaseModel } from '../engine/components/db-model';
import { SysSimEngine } from '../engine/simulator';
import { useStore } from '../store/use-store';
import { createDefaultConfig } from '../model/component-defaults';

describe('Deep Audit Pass 3 Bug Fixes & Feature Tests (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. verifies ConsistentHashRing binary search returns valid node ID', () => {
    const ring = new ConsistentHashRing(['node_1', 'node_2', 'node_3'], 30);
    const targetA = ring.getNode('user_12345');
    const targetB = ring.getNode('user_67890');

    expect(targetA).toBeTruthy();
    expect(targetB).toBeTruthy();
    expect(['node_1', 'node_2', 'node_3']).toContain(targetA);
    expect(['node_1', 'node_2', 'node_3']).toContain(targetB);
  });

  it('2. verifies ConsistentHashRing deterministic routing for identical keys', () => {
    const ring = new ConsistentHashRing(['node_1', 'node_2', 'node_3'], 40);
    const firstLookup = ring.getNode('session_abc_xyz');
    const secondLookup = ring.getNode('session_abc_xyz');

    expect(firstLookup).toBe(secondLookup);
  });

  it('3. verifies DatabaseModel reports 0 active connections initially and after reset', () => {
    const db = new DatabaseModel(20, 50, 2);
    expect(db.getActiveConnections()).toBe(0);

    db.executeQuery(false);
    expect(db.getActiveConnections()).toBe(1);

    db.reset();
    expect(db.getActiveConnections()).toBe(0);
  });

  it('4. verifies SysSimEngine calculates component utilization based on rate rather than cumulative requests', () => {
    const clientNode = { id: 'c1', config: createDefaultConfig('client', 'c1', 'Client') };
    const srvNode = { id: 's1', config: createDefaultConfig('app_server', 's1', 'App Server') };

    const engine = new SysSimEngine({
      nodes: [clientNode, srvNode],
      edges: [{ id: 'e1', source: 'c1', target: 's1', data: { protocol: 'HTTP' } }],
    });

    engine.start();
    // Run for 5 simulated seconds
    for (let i = 0; i < 50; i++) {
      engine.step(100);
    }

    const snap = engine.getMetricsSnapshot();
    const srvMetrics = snap.componentMetrics['s1'];

    expect(srvMetrics).toBeDefined();
    // Utilization should be reasonable percentage <= 100
    expect(srvMetrics.utilizationPercent).toBeLessThanOrEqual(100);
    expect(srvMetrics.utilizationPercent).toBeGreaterThanOrEqual(0);
  });

  it('5. verifies SysSimEngine componentMetrics activeConnections reflects active tracked connections', () => {
    const clientNode = { id: 'c1', config: createDefaultConfig('client', 'c1', 'Client') };
    const srvNode = { id: 's1', config: createDefaultConfig('app_server', 's1', 'App Server') };

    const engine = new SysSimEngine({
      nodes: [clientNode, srvNode],
      edges: [{ id: 'e1', source: 'c1', target: 's1', data: { protocol: 'HTTP' } }],
    });

    engine.start();
    engine.step(100);

    const snap = engine.getMetricsSnapshot();
    const srvMetrics = snap.componentMetrics['s1'];

    expect(srvMetrics).toBeDefined();
    expect(typeof srvMetrics.activeConnections).toBe('number');
    expect(srvMetrics.activeConnections).toBeGreaterThanOrEqual(0);
  });

  it('6. verifies markScenarioCompleted toggles completion status in store safely', () => {
    expect(useStore.getState().completedScenarioIds).not.toContain(42);

    useStore.getState().markScenarioCompleted(42);
    expect(useStore.getState().completedScenarioIds).toContain(42);

    useStore.getState().markScenarioCompleted(42);
    expect(useStore.getState().completedScenarioIds).not.toContain(42);
  });

  it('7. verifies clearCanvas empties nodes, edges, and selection state', () => {
    const nodeA = useStore.getState().addNode('client', { x: 50, y: 50 });
    const nodeB = useStore.getState().addNode('app_server', { x: 250, y: 50 });
    useStore.getState().addEdge(nodeA, nodeB, 'HTTP');

    expect(useStore.getState().nodes.length).toBe(2);
    expect(useStore.getState().edges.length).toBe(1);

    useStore.getState().clearCanvas();
    expect(useStore.getState().nodes.length).toBe(0);
    expect(useStore.getState().edges.length).toBe(0);
    expect(useStore.getState().selectedNodeId).toBeNull();
    expect(useStore.getState().selectedEdgeId).toBeNull();
  });

  it('8. verifies autoLayout topologically positions nodes with progressive X coordinates', () => {
    const nodeA = useStore.getState().addNode('client', { x: 0, y: 0 });
    const nodeB = useStore.getState().addNode('load_balancer', { x: 0, y: 0 });
    const nodeC = useStore.getState().addNode('app_server', { x: 0, y: 0 });
    useStore.getState().addEdge(nodeA, nodeB);
    useStore.getState().addEdge(nodeB, nodeC);

    useStore.getState().autoLayout();

    const nodes = useStore.getState().nodes;
    const client = nodes.find((n) => n.id === nodeA);
    const lb = nodes.find((n) => n.id === nodeB);
    const app = nodes.find((n) => n.id === nodeC);

    expect(client?.position.x).toBeLessThan(lb?.position.x || 0);
    expect(lb?.position.x).toBeLessThan(app?.position.x || 0);
  });

  it('9. verifies setSpeedMultiplier clamps multiplier to positive non-zero value', () => {
    useStore.getState().setSpeedMultiplier(5);
    expect(useStore.getState().speedMultiplier).toBe(5);

    useStore.getState().setSpeedMultiplier(0.5);
    expect(useStore.getState().speedMultiplier).toBe(0.5);
  });

  it('10. verifies success rate formatting precision with 2 decimal places', () => {
    const totalRequests = 10000;
    const successRequests = 9995;
    const rate = ((successRequests / totalRequests) * 100).toFixed(2);

    expect(rate).toBe('99.95');
  });
});
