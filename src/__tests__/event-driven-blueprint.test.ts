import { afterEach, describe, expect, it } from 'vitest';
import { createSimRequest } from '../engine/request';
import { SysSimEngine } from '../engine/simulator';
import { ARCHITECTURE_BLUEPRINTS } from '../model/blueprints';
import { SimRequest } from '../model/types';
import { setIdEntropySource } from '../platform/id';

describe('event-driven blueprint semantics', () => {
  afterEach(() => setIdEntropySource());

  it('acknowledges at the queue and later completes both consumer-group deliveries', () => {
    setIdEntropySource(() => 'fixture');
    const blueprint = ARCHITECTURE_BLUEPRINTS.find((entry) => entry.id === 'event_driven_pipeline');
    const graph = blueprint!.create(0, 0);
    const engine = new SysSimEngine(
      {
        nodes: graph.nodes.map((node) => ({ id: node.id, config: node.data.config })),
        edges: graph.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          data: edge.data!,
        })),
      },
      {
        pattern: 'steady',
        baseQps: 0,
        burstMultiplier: 1,
        rampDurationSec: 1,
        spikeFrequencySec: 1,
        seed: 7,
      },
    );

    const gatewayId = graph.nodes.find((node) => node.data.config.type === 'api_gateway')!.id;
    const queueId = graph.nodes.find((node) => node.data.config.type === 'message_queue')!.id;
    const workerIds = graph.nodes
      .filter((node) => node.data.config.type === 'worker')
      .map((node) => node.id);
    const request = createSimRequest(gatewayId, 0, 'order:1', 1);
    (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
    expect(request.path.map((hop) => hop.nodeId)).toEqual([gatewayId, queueId]);
    expect(request.path.at(-1)?.status).toBe('queued');

    engine.start();
    engine.step(1000);
    const metrics = engine.getMetricsSnapshot();
    expect(metrics.componentMetrics[queueId]).toMatchObject({
      producerAccepted: 1,
      consumerSucceeded: 2,
      queueDepth: 0,
    });
    expect(
      metrics.componentMetrics[workerIds[0]].totalRequests +
        metrics.componentMetrics[workerIds[1]].totalRequests,
    ).toBe(2);
  });
});
