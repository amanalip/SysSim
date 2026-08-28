import { describe, expect, it, vi } from 'vitest';
import { createSimRequest } from '../engine/request';
import { SysSimEngine } from '../engine/simulator';
import { ARCHITECTURE_BLUEPRINTS } from '../model/blueprints';
import { SimRequest } from '../model/types';

describe('event-driven blueprint semantics', () => {
  it('acknowledges at the queue and later completes both consumer-group deliveries', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    const blueprint = ARCHITECTURE_BLUEPRINTS.find((entry) => entry.id === 'event_driven_pipeline');
    const graph = blueprint!.create(0, 0);
    const engine = new SysSimEngine({
      nodes: graph.nodes.map((node) => ({ id: node.id, config: node.data.config })),
      edges: graph.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, data: edge.data! })),
    }, { pattern: 'steady', baseQps: 0, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 7 });

    const request = createSimRequest('gw_1234', 0, 'order:1', 1);
    (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
    expect(request.path.map((hop) => hop.nodeId)).toEqual(['gw_1234', 'q_1234']);
    expect(request.path.at(-1)?.status).toBe('queued');

    engine.start();
    engine.step(1000);
    const metrics = engine.getMetricsSnapshot();
    expect(metrics.componentMetrics.q_1234).toMatchObject({
      producerAccepted: 1,
      consumerSucceeded: 2,
      queueDepth: 0,
    });
    expect(metrics.componentMetrics.w1_1234.totalRequests + metrics.componentMetrics.w2_1234.totalRequests).toBe(2);
    vi.restoreAllMocks();
  });
});
