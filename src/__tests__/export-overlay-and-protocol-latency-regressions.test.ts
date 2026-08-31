import { describe, it, expect, beforeEach } from 'vitest';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';

describe('Bugs Batch 5: PNG Export Overlays Exclusion & Edge Protocol Transport Latency', () => {
  let engine: SysSimEngine;

  beforeEach(() => {
    engine = new SysSimEngine();
  });

  it('Bug 12: gRPC transport edge has lower latency overhead than HTTP edge', () => {
    const clientNode = {
      id: 'client_1',
      config: createDefaultConfig('client', 'client_1', 'Client'),
    };
    const appNode = {
      id: 'app_1',
      config: createDefaultConfig('app_server', 'app_1', 'App Server'),
    };

    // Test with gRPC edge (1ms overhead)
    const grpcGraph: SimGraph = {
      nodes: [clientNode, appNode],
      edges: [
        {
          id: 'e1',
          source: 'client_1',
          target: 'app_1',
          data: { protocol: 'gRPC', isCut: false },
        },
      ],
    };

    engine.setGraph(grpcGraph);
    const req1 = {
      id: 'req_grpc',
      timestamp: Date.now(),
      sourceNodeId: 'client_1',
      targetNodeId: 'app_1',
      startTimeMs: 0,
      totalLatencyMs: 0,
      path: [],
      status: 'pending' as const,
      color: '#3b82f6',
    };
    (engine as any).processRequest(req1);
    const grpcTotalLatency = req1.totalLatencyMs;

    // Test with HTTP edge (4ms overhead)
    const httpGraph: SimGraph = {
      nodes: [clientNode, appNode],
      edges: [
        {
          id: 'e2',
          source: 'client_1',
          target: 'app_1',
          data: { protocol: 'HTTP', isCut: false },
        },
      ],
    };

    const engineHttp = new SysSimEngine();
    engineHttp.setGraph(httpGraph);
    const req2 = {
      id: 'req_http',
      timestamp: Date.now(),
      sourceNodeId: 'client_1',
      targetNodeId: 'app_1',
      startTimeMs: 0,
      totalLatencyMs: 0,
      path: [],
      status: 'pending' as const,
      color: '#3b82f6',
    };
    (engineHttp as any).processRequest(req2);
    const httpTotalLatency = req2.totalLatencyMs;

    expect(grpcTotalLatency).toBeLessThan(httpTotalLatency);
  });
});
