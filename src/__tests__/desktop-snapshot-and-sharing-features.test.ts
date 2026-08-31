import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { ARCHITECTURE_BLUEPRINTS } from '../model/blueprints';
import { SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';

describe('Desktop UX/UI Enhancements (Features 11 & 12)', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      toasts: [],
    });
  });

  it('Feature 11: Multi-color diagnostic particles classify async queue and error flows', () => {
    const clientConfig = createDefaultConfig('client', 'c1', 'Client');
    const gwConfig = createDefaultConfig('api_gateway', 'gw1', 'Gateway');
    const qConfig = createDefaultConfig('message_queue', 'q1', 'Queue');

    const engine = new SysSimEngine(
      {
        nodes: [
          {
            id: 'c1',
            config: clientConfig,
          },
          {
            id: 'gw1',
            config: gwConfig,
          },
          {
            id: 'q1',
            config: qConfig,
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'c1',
            target: 'gw1',
            data: { protocol: 'HTTP', isCut: false, latencyMs: 2 },
          },
          {
            id: 'e2',
            source: 'gw1',
            target: 'q1',
            data: { protocol: 'gRPC', isCut: false, latencyMs: 2 },
          },
        ],
      },
      {
        baseQps: 100,
        pattern: 'steady',
        burstMultiplier: 3,
        rampDurationSec: 30,
        spikeFrequencySec: 10,
      },
    );

    engine.start();
    engine.step(100);
    const completed = (engine as any).completedRequests;
    expect(completed.length).toBeGreaterThan(0);
    const asyncReq = completed.find((r: any) =>
      r.path.some((p: any) => p.nodeType === 'message_queue'),
    );
    expect(asyncReq).toBeDefined();
    expect(asyncReq.color).toBe('#a855f7');
  });

  it('Feature 12: Pre-assembled blueprints create interconnected components with valid edges', () => {
    expect(ARCHITECTURE_BLUEPRINTS.length).toBeGreaterThanOrEqual(3);

    const microserviceBp = ARCHITECTURE_BLUEPRINTS.find((b) => b.id === 'scalable_microservice');
    expect(microserviceBp).toBeDefined();
    const res = microserviceBp!.create(100, 100);
    expect(res.nodes.length).toBe(4);
    expect(res.edges.length).toBe(4);

    const haDbBp = ARCHITECTURE_BLUEPRINTS.find((b) => b.id === 'ha_database_cluster');
    expect(haDbBp).toBeDefined();
    const haRes = haDbBp!.create(200, 200);
    expect(haRes.nodes.length).toBe(3);
    expect(haRes.edges.length).toBe(2);

    const eventBp = ARCHITECTURE_BLUEPRINTS.find((b) => b.id === 'event_driven_pipeline');
    expect(eventBp).toBeDefined();
    const eventRes = eventBp!.create(0, 0);
    expect(eventRes.nodes.length).toBe(5);
    expect(eventRes.edges.length).toBe(5);
  });
});
