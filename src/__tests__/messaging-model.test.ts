import { describe, expect, it } from 'vitest';
import {
  MessagingKind,
  MessagingModel,
  MessagingModelOptions,
} from '../engine/components/messaging-model';

const options = (overrides: Partial<MessagingModelOptions> = {}): MessagingModelOptions => ({
  kind: 'task_queue',
  maxDepth: 1000,
  partitions: 1,
  consumerGroups: 1,
  subscribersPerTopic: 1,
  fanoutFactor: 1,
  throughputPerPartitionPerSec: 100,
  producerAckLatencyMs: 4,
  consumerProcessingLatencyMs: 10,
  deliveryGuarantee: 'at_least_once',
  orderingGuarantee: 'FIFO',
  retryLimit: 2,
  retryDelayMs: 100,
  deadLetterQueue: true,
  ...overrides,
});

const workers = (overrides = {}) => ({
  replicas: 1,
  concurrencyLimit: 100,
  processingRatePerSec: 1000,
  ...overrides,
});

describe('messaging model', () => {
  it.each<[MessagingKind, Partial<MessagingModelOptions>, number]>([
    ['message_queue', { consumerGroups: 3 }, 3],
    ['task_queue', {}, 1],
    ['pubsub', { subscribersPerTopic: 4 }, 4],
    ['event_bus', { fanoutFactor: 2 }, 2],
  ])('models %s delivery copies independently', (kind, overrides, copies) => {
    const model = new MessagingModel(options({ kind, ...overrides }));
    const result = model.enqueue('message-1', 'customer:42', 0);
    expect(result.accepted).toBe(true);
    expect(result.deliveryCopies).toBe(copies);
    expect(result.depth).toBe(copies);
    expect(result.acknowledgementLatencyMs).toBe(4);
  });

  it('changes queue depth from arrivals and time-based drain rates', () => {
    const model = new MessagingModel(options({ throughputPerPartitionPerSec: 10 }));
    for (let index = 0; index < 20; index++) model.enqueue(`m-${index}`, `key-${index}`, 0);
    expect(model.drain(500, 500, workers(), () => true)).toMatchObject({ delivered: 5, depth: 15 });
    expect(model.drain(500, 1000, workers(), () => true)).toMatchObject({ delivered: 5, depth: 10 });
  });

  it('uses worker replicas, concurrency, and processing rate as drain limits', () => {
    const make = () => {
      const model = new MessagingModel(options({
        partitions: 20,
        orderingGuarantee: 'None',
        throughputPerPartitionPerSec: 1000,
        consumerProcessingLatencyMs: 1000,
      }));
      for (let index = 0; index < 50; index++) model.enqueue(`m-${index}`, `key-${index}`, 0);
      return model;
    };
    expect(make().drain(1000, 1000, workers({ replicas: 2, concurrencyLimit: 3, processingRatePerSec: 4 }), () => true).delivered).toBe(6);
    expect(make().drain(1000, 1000, workers({ replicas: 4, concurrencyLimit: 3, processingRatePerSec: 4 }), () => true).delivered).toBe(12);
  });

  it('uses populated partitions to increase bounded parallel drain capacity', () => {
    const run = (partitions: number) => {
      const model = new MessagingModel(options({
        partitions,
        orderingGuarantee: 'Partition Key',
        throughputPerPartitionPerSec: 10,
      }));
      for (let index = 0; index < 100; index++) model.enqueue(`m-${index}`, `key-${index}`, 0);
      return model.drain(1000, 1000, workers(), () => true).delivered;
    };
    expect(run(1)).toBe(10);
    expect(run(4)).toBe(40);
  });

  it('applies at-most-once, at-least-once, and exactly-once semantics', () => {
    const atMostOnce = new MessagingModel(options({ deliveryGuarantee: 'at_most_once' }));
    atMostOnce.enqueue('m', 'key', 0);
    expect(atMostOnce.drain(1000, 0, workers(), () => false)).toMatchObject({ dropped: 0, deadLettered: 1, depth: 0 });

    const atLeastOnce = new MessagingModel(options({ deliveryGuarantee: 'at_least_once' }));
    atLeastOnce.enqueue('m', 'key', 0);
    expect(atLeastOnce.drain(1000, 0, workers(), () => false)).toMatchObject({ retried: 1, depth: 1 });
    expect(atLeastOnce.drain(1000, 99, workers(), () => true).attempted).toBe(0);
    expect(atLeastOnce.drain(1000, 100, workers(), () => true)).toMatchObject({ delivered: 1, depth: 0 });

    const exactlyOnce = new MessagingModel(options({ deliveryGuarantee: 'exactly_once' }));
    let calls = 0;
    exactlyOnce.enqueue('same-id', 'key', 0);
    exactlyOnce.drain(1000, 0, workers(), () => { calls++; return true; });
    exactlyOnce.enqueue('same-id', 'key', 1);
    exactlyOnce.drain(1000, 1, workers(), () => { calls++; return true; });
    expect(calls).toBe(1);
  });

  it('uses exponential retry delay and moves exhausted work to the DLQ', () => {
    const model = new MessagingModel(options({ retryLimit: 1, retryDelayMs: 50 }));
    model.enqueue('m', 'key', 0);
    expect(model.drain(1000, 0, workers(), () => false).retried).toBe(1);
    expect(model.drain(1000, 49, workers(), () => false).attempted).toBe(0);
    expect(model.drain(1000, 50, workers(), () => false).deadLettered).toBe(1);
    expect(model.getDeadLetterDepth()).toBe(1);
  });

  it('blocks global FIFO behind a retry but allows another key partition to progress', () => {
    const fifo = new MessagingModel(options({ orderingGuarantee: 'FIFO', retryDelayMs: 100 }));
    fifo.enqueue('first', 'a', 0);
    fifo.enqueue('second', 'b', 0);
    const fifoOrder: string[] = [];
    fifo.drain(1000, 0, workers(), (attempt) => {
      fifoOrder.push(attempt.messageId);
      return attempt.messageId !== 'first';
    });
    expect(fifoOrder).toEqual(['first']);

    const keyed = new MessagingModel(options({
      partitions: 2,
      orderingGuarantee: 'Partition Key',
      retryDelayMs: 100,
    }));
    const first = keyed.enqueue('first', 'a', 0);
    const second = keyed.enqueue('second', 'b', 0);
    expect(first.partition).not.toBe(second.partition);
    const keyedOrder: string[] = [];
    keyed.drain(1000, 0, workers(), (attempt) => {
      keyedOrder.push(attempt.messageId);
      return attempt.messageId !== 'first';
    });
    expect(keyedOrder).toEqual(['first', 'second']);
  });
});
