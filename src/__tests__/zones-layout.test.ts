import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { computeAutoLayout } from '../layout/auto-layout';

describe('Zone Grouping & Auto-Layout Tests (Milestone 5)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
  });

  it('manages zones in store', () => {
    useStore.getState().addZone('Public Zone', 'public', {
      x: 50,
      y: 50,
      width: 400,
      height: 300,
    });

    let zones = useStore.getState().zones;
    expect(zones.length).toBe(1);
    expect(zones[0].label).toBe('Public Zone');
    expect(zones[0].category).toBe('public');

    const zoneId = zones[0].id;
    useStore.getState().updateZone(zoneId, { label: 'Updated Edge Zone' });
    zones = useStore.getState().zones;
    expect(zones[0].label).toBe('Updated Edge Zone');

    useStore.getState().removeZone(zoneId);
    expect(useStore.getState().zones.length).toBe(0);
  });

  it('computes DAG auto-layout for linear pipeline', () => {
    const client = useStore.getState().addNode('client', { x: 0, y: 0 });
    const lb = useStore.getState().addNode('load_balancer', { x: 0, y: 0 });
    const app = useStore.getState().addNode('app_server', { x: 0, y: 0 });
    const db = useStore.getState().addNode('sql_db', { x: 0, y: 0 });

    useStore.getState().addEdge(client, lb);
    useStore.getState().addEdge(lb, app);
    useStore.getState().addEdge(app, db);

    const nodes = useStore.getState().nodes;
    const edges = useStore.getState().edges;

    const layouted = computeAutoLayout(nodes, edges);

    const clientNode = layouted.find((n) => n.id === client)!;
    const lbNode = layouted.find((n) => n.id === lb)!;
    const appNode = layouted.find((n) => n.id === app)!;
    const dbNode = layouted.find((n) => n.id === db)!;

    // In a linear left-to-right flow, X positions must monotonically increase
    expect(clientNode.position.x).toBeLessThan(lbNode.position.x);
    expect(lbNode.position.x).toBeLessThan(appNode.position.x);
    expect(appNode.position.x).toBeLessThan(dbNode.position.x);
  });
});
