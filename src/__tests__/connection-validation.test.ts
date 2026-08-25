import { describe, it, expect, beforeEach } from 'vitest';
import { validateConnection } from '../model/validation';
import { useStore } from '../store/use-store';

describe('Connection System & Validation Tests (Milestone 3)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
  });

  it('validates standard connections correctly', () => {
    const clientToLb = validateConnection('client', 'load_balancer');
    expect(clientToLb.valid).toBe(true);
    expect(clientToLb.recommendedProtocol).toBe('HTTP');

    const lbToApp = validateConnection('load_balancer', 'app_server');
    expect(lbToApp.valid).toBe(true);

    const appToDb = validateConnection('app_server', 'sql_db');
    expect(appToDb.valid).toBe(true);
    expect(appToDb.recommendedProtocol).toBe('gRPC');
  });

  it('flags irregular architecture connections with warnings', () => {
    const clientToDb = validateConnection('client', 'sql_db');
    expect(clientToDb.valid).toBe(false);
    expect(clientToDb.message).toBeDefined();
    expect(clientToDb.message).toContain('not recommended');
  });

  it('adds validated edges to the canvas store', () => {
    const n1 = useStore.getState().addNode('client', { x: 0, y: 0 });
    const n2 = useStore.getState().addNode('load_balancer', { x: 200, y: 0 });

    const added = useStore.getState().addEdge(n1, n2);
    expect(added).toBe(true);

    const edges = useStore.getState().edges;
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe(n1);
    expect(edges[0].target).toBe(n2);
    expect(edges[0].data.protocol).toBe('HTTP');
  });

  it('updates edge protocols and removes edges', () => {
    const n1 = useStore.getState().addNode('app_server', { x: 0, y: 0 });
    const n2 = useStore.getState().addNode('redis_cache', { x: 200, y: 0 });

    useStore.getState().addEdge(n1, n2);
    const edgeId = useStore.getState().edges[0].id;

    useStore.getState().updateEdgeProtocol(edgeId, 'TCP');
    expect(useStore.getState().edges[0].data.protocol).toBe('TCP');

    useStore.getState().removeEdge(edgeId);
    expect(useStore.getState().edges.length).toBe(0);
  });
});
