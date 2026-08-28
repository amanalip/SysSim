import { describe, expect, it } from 'vitest';
import { createSimRequest } from '../engine/request';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import {
  MessageQueueConfig,
  PubSubConfig,
  SimRequest,
  WorkerConfig,
} from '../model/types';

const traffic = {
  pattern: 'steady' as const,
  baseQps: 0,
  burstMultiplier: 1,
  rampDurationSec: 1,
  spikeFrequencySec: 1,
  seed: 9,
};

const execute = (engine: SysSimEngine, source: string, sequence: number) => {
  const request = createSimRequest(source, sequence, `key-${sequence}`, sequence);
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};

const queueConfig = (overrides: Partial<MessageQueueConfig> = {}): MessageQueueConfig => ({
  ...(createDefaultConfig('message_queue', 'queue', 'Queue') as MessageQueueConfig),
  consumerGroups: 1,
  producerAckLatencyMs: 3,
  consumerProcessingLatencyMs: 100,
  consumerThroughputPerSec: 1000,
  ...overrides,
});

const workerConfig = (id: string, overrides: Partial<WorkerConfig> = {}): WorkerConfig => ({
  ...(createDefaultConfig('worker', id, id) as WorkerConfig),
  replicas: 1,
  concurrencyLimit: 1,
  jobProcessingRatePerSec: 10,
  ...overrides,
});

describe('messaging engine integration', () => {
  it('returns producer acknowledgement before independent consumer work', () => {
    const graph: SimGraph = {
      nodes: [
        { id: 'client', config: createDefaultConfig('client', 'client', 'Client') },
        { id: 'queue', config: queueConfig() },
        { id: 'worker', config: workerConfig('worker') },
      ],
      edges: [
        { id: 'enqueue', source: 'client', target: 'queue', data: { protocol: 'HTTP', purpose: 'async', latencyMs: 2 } },
        { id: 'consume', source: 'queue', target: 'worker', data: { protocol: 'TCP', purpose: 'request' } },
      ],
    };
    const engine = new SysSimEngine(graph, traffic);
    const request = execute(engine, 'client', 1);
    let metrics = engine.getMetricsSnapshot();

    expect(request.path.map((hop) => hop.nodeId)).toEqual(['client', 'queue']);
    expect(request.path[1].status).toBe('queued');
    expect(request.path[1].latencyMs).toBe(3);
    expect(request.path[1].info).toContain('Producer acknowledged');
    expect(request.totalLatencyMs).toBeLessThan(100);
    expect(metrics.componentMetrics.worker.totalRequests).toBe(0);
    expect(metrics.componentMetrics.queue.queueDepth).toBe(1);

    engine.start();
    engine.step(1000);
    metrics = engine.getMetricsSnapshot();
    expect(metrics.componentMetrics.worker.totalRequests).toBe(1);
    expect(metrics.componentMetrics.queue.queueDepth).toBe(0);
  });

  it('scales background drain with worker replicas, concurrency, and rate', () => {
    const run = (worker: WorkerConfig) => {
      const engine = new SysSimEngine({
        nodes: [
          { id: 'queue', config: queueConfig({ consumerProcessingLatencyMs: 1 }) },
          { id: 'worker', config: worker },
        ],
        edges: [{ id: 'consume', source: 'queue', target: 'worker', data: { protocol: 'TCP', purpose: 'request' } }],
      }, traffic);
      for (let sequence = 0; sequence < 20; sequence++) execute(engine, 'queue', sequence);
      engine.start();
      engine.step(1000);
      return engine.getMetricsSnapshot();
    };

    const small = run(workerConfig('worker', { replicas: 1, concurrencyLimit: 1, jobProcessingRatePerSec: 2 }));
    const large = run(workerConfig('worker', { replicas: 3, concurrencyLimit: 2, jobProcessingRatePerSec: 2 }));
    expect(small.componentMetrics.worker.totalRequests).toBe(2);
    expect(large.componentMetrics.worker.totalRequests).toBe(6);
    expect(large.componentMetrics.queue.queueDepth).toBeLessThan(small.componentMetrics.queue.queueDepth);
  });

  it('fans one pub/sub publication out to the configured subscriber count', () => {
    const pubsub = {
      ...(createDefaultConfig('pubsub', 'pubsub', 'Topics') as PubSubConfig),
      subscribersPerTopic: 3,
      consumerProcessingLatencyMs: 1,
      consumerThroughputPerSec: 1000,
    };
    const engine = new SysSimEngine({
      nodes: [
        { id: 'pubsub', config: pubsub },
        { id: 'worker-a', config: workerConfig('worker-a', { jobProcessingRatePerSec: 100 }) },
        { id: 'worker-b', config: workerConfig('worker-b', { jobProcessingRatePerSec: 100 }) },
      ],
      edges: [
        { id: 'a', source: 'pubsub', target: 'worker-a', data: { protocol: 'pub/sub', purpose: 'fanout' } },
        { id: 'b', source: 'pubsub', target: 'worker-b', data: { protocol: 'pub/sub', purpose: 'fanout' } },
      ],
    }, traffic);
    execute(engine, 'pubsub', 1);
    expect(engine.getMetricsSnapshot().componentMetrics.pubsub.queueDepth).toBe(3);
    engine.start();
    engine.step(1000);
    const metrics = engine.getMetricsSnapshot();
    expect(metrics.componentMetrics['worker-a'].totalRequests + metrics.componentMetrics['worker-b'].totalRequests).toBe(3);
    expect(metrics.componentMetrics.pubsub.queueDepth).toBe(0);
  });
});
