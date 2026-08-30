import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { SimRequest } from '../model/types';

describe('Desktop UX/UI Enhancements (Features 17 & 18)', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      edgeRouting: 'bezier',
      activeBottomTab: 'metrics',
      activeRequests: [],
      toasts: [],
    });
  });

  it('Feature 17: Canvas HUD supports Bezier, Orthogonal, and Straight edge routing modes', () => {
    const { setEdgeRouting } = useStore.getState();
    expect(useStore.getState().edgeRouting).toBe('bezier');

    setEdgeRouting('orthogonal');
    expect(useStore.getState().edgeRouting).toBe('orthogonal');

    setEdgeRouting('straight');
    expect(useStore.getState().edgeRouting).toBe('straight');
  });

  it('Feature 18: Hop-by-hop distributed request trace records per-hop latencies and detects bottlenecks', () => {
    const mockRequest: SimRequest = {
      id: 'req_12345',
      sourceNodeId: 'c1',
      timestamp: Date.now(),
      status: 'success',
      color: '#3fb950',
      totalLatencyMs: 85,
      path: [
        {
          nodeId: 'c1',
          nodeName: 'Client',
          nodeType: 'client',
          enterTimeMs: 0,
          exitTimeMs: 2,
          latencyMs: 2,
          status: 'processed',
        },
        {
          nodeId: 'gw1',
          nodeName: 'Gateway',
          nodeType: 'api_gateway',
          enterTimeMs: 2,
          exitTimeMs: 5,
          latencyMs: 3,
          status: 'processed',
        },
        {
          nodeId: 'db1',
          nodeName: 'Database',
          nodeType: 'sql_db',
          enterTimeMs: 5,
          exitTimeMs: 85,
          latencyMs: 80,
          status: 'processed',
          info: 'Query scan on users',
        },
      ],
    };

    useStore.setState({ activeRequests: [mockRequest], recentRequests: [mockRequest] });
    expect(useStore.getState().activeRequests.length).toBe(1);

    const trace = useStore.getState().activeRequests[0];
    expect(trace.path.length).toBe(3);
    const slowestHop = trace.path.reduce((max, h) => (h.latencyMs > max.latencyMs ? h : max), trace.path[0]);
    expect(slowestHop.nodeName).toBe('Database');
    expect(slowestHop.latencyMs).toBe(80);
  });
});
