import { describe, it, expect } from 'vitest';
import { ARCHITECTURE_BLUEPRINTS } from '../model/blueprints';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';

describe('Bugs Batch 9: Blueprint Node Types, Security/Serverless Execution, Worker Fallback', () => {
  it('Bug 21: Architecture blueprints create nodes with customComponent node type', () => {
    ARCHITECTURE_BLUEPRINTS.forEach((bp) => {
      const { nodes } = bp.create(100, 100);
      nodes.forEach((n) => {
        expect(n.type).toBe('customComponent');
      });
    });
  });

  it('Bug 22: Auth service validation latency and serverless execution are evaluated in engine', () => {
    const engine = new SysSimEngine();
    const clientNode = {
      id: 'client_1',
      config: createDefaultConfig('client', 'client_1', 'Client'),
    };
    const authNode = {
      id: 'auth_1',
      config: createDefaultConfig('auth_service', 'auth_1', 'JWT Auth'),
    };
    const serverlessNode = {
      id: 'func_1',
      config: createDefaultConfig('serverless', 'func_1', 'Lambda'),
    };

    const graph: SimGraph = {
      nodes: [clientNode, authNode, serverlessNode],
      edges: [
        {
          id: 'e1',
          source: 'client_1',
          target: 'auth_1',
          data: { protocol: 'HTTP', isCut: false },
        },
        { id: 'e2', source: 'auth_1', target: 'func_1', data: { protocol: 'gRPC', isCut: false } },
      ],
    };

    engine.setGraph(graph);
    const req = {
      id: 'req_security_test',
      timestamp: Date.now(),
      sourceNodeId: 'client_1',
      targetNodeId: 'func_1',
      startTimeMs: 0,
      totalLatencyMs: 0,
      path: [],
      status: 'pending' as const,
      color: '#3b82f6',
    };

    (engine as any).processRequest(req);
    expect(req.status).toBe('success');
    expect(req.path.some((p: any) => p.nodeType === 'auth_service')).toBe(true);
    expect(req.path.some((p: any) => p.nodeType === 'serverless')).toBe(true);
    expect(req.totalLatencyMs).toBeGreaterThan(10);
  });
});
