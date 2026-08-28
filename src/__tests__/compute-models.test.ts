import { describe, expect, it } from 'vitest';
import { WorkerModel } from '../engine/components/worker-model';
import { ServerlessModel } from '../engine/components/serverless-model';
import { MessagingModel } from '../engine/components/messaging-model';

describe('worker execution semantics', () => {
  it('uses replicas, concurrency, rate, latency, retries, and reports work telemetry', () => {
    const worker = new WorkerModel(2, 3, 25, 10, 1);
    worker.beginStep();
    for (let index = 0; index < 8; index++) worker.recordAttempt(index < 5, index === 5);
    worker.setQueuedWork(7);
    expect(worker.getProcessingLatencyMs()).toBe(40);
    expect(worker.getMetrics()).toMatchObject({
      busyWorkers: 6, queuedWork: 7, jobsSucceeded: 5, jobsFailed: 3,
      retriesScheduled: 1, utilizationPercent: 100,
    });
  });

  it('enforces the lower broker/worker retry limit', () => {
    const queue = new MessagingModel({
      kind: 'task_queue', maxDepth: 10, partitions: 1, consumerGroups: 1,
      subscribersPerTopic: 1, fanoutFactor: 1, throughputPerPartitionPerSec: 100,
      producerAckLatencyMs: 1, consumerProcessingLatencyMs: 1,
      deliveryGuarantee: 'at_least_once', orderingGuarantee: 'FIFO', retryLimit: 5,
      retryDelayMs: 0, deadLetterQueue: true, retentionMs: 10000, overflowPolicy: 'reject_newest',
    });
    queue.enqueue('job', 'key', 0);
    const capacity = { replicas: 1, concurrencyLimit: 10, processingRatePerSec: 100 };
    const drained = queue.drain(100, 0, capacity, () => ({ success: false, retryLimit: 1 }));
    expect(drained).toMatchObject({ retried: 1, deadLettered: 1 });
    expect(queue.getMetrics(1)).toMatchObject({ consumerFailed: 2, retries: 1, deadLettered: 1 });
  });
});

describe('serverless execution semantics', () => {
  it('keeps provisioned instances warm and throttles beyond concurrency', () => {
    const model = new ServerlessModel(1, 1000, 512, 100, 50, 1, 60, () => 0);
    const first = model.invoke(0);
    const second = model.invoke(0);
    expect(first).toMatchObject({ coldStart: false, queueLatencyMs: 0, executionLatencyMs: 50 });
    expect(second).toMatchObject({ throttled: true, queueLatencyMs: 0, totalLatencyMs: 1 });
    expect(model.getMetrics(0)).toMatchObject({ activeInvocations: 1, warmStarts: 1, throttles: 1, utilizationPercent: 100 });
  });

  it('models cold probability over idle time, memory scaling, and timeout', () => {
    const cold = new ServerlessModel(2, 1000, 2048, 100, 80, 0, 10, () => 0.99);
    const first = cold.invoke(0);
    expect(first).toMatchObject({ coldStart: true, coldStartProbabilityPercent: 100, executionLatencyMs: 40 });
    const warm = cold.invoke(1000);
    expect(warm.coldStartProbabilityPercent).toBe(0);

    const timeout = new ServerlessModel(1, 50, 128, 100, 100, 0, 10, () => 0);
    expect(timeout.invoke(0)).toMatchObject({ timedOut: true, totalLatencyMs: 50 });
    expect(timeout.getMetrics(0)).toMatchObject({ timeouts: 1, invocationFailures: 1 });
  });
});
