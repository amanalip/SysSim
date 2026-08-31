export type MessagingKind = 'message_queue' | 'task_queue' | 'pubsub' | 'event_bus';
export type DeliveryGuarantee = 'at_most_once' | 'at_least_once' | 'exactly_once';
export type MessageOrdering = 'FIFO' | 'Partition Key' | 'None';
export type QueueOverflowPolicy = 'reject_newest' | 'drop_oldest';

export interface MessagingModelOptions {
  kind: MessagingKind;
  maxDepth: number;
  partitions: number;
  consumerGroups: number;
  subscribersPerTopic: number;
  fanoutFactor: number;
  throughputPerPartitionPerSec: number;
  producerAckLatencyMs: number;
  consumerProcessingLatencyMs: number;
  deliveryGuarantee: DeliveryGuarantee;
  orderingGuarantee: MessageOrdering;
  retryLimit: number;
  retryDelayMs: number;
  deadLetterQueue: boolean;
  retentionMs: number;
  overflowPolicy: QueueOverflowPolicy;
}

export interface WorkerCapacity {
  replicas: number;
  concurrencyLimit: number;
  processingRatePerSec: number;
}

export interface DeliveryAttempt {
  deliveryId: string;
  messageId: string;
  requestKey: string;
  partition: number;
  recipientIndex: number;
  attempt: number;
  payloadSizeKb?: number;
  operationType?: 'read' | 'write';
}

export interface DeliveryOutcome {
  success: boolean;
  retryLimit?: number;
}

export interface EnqueueResult {
  accepted: boolean;
  depth: number;
  acknowledgementLatencyMs: number;
  partition: number;
  deliveryCopies: number;
  dropped: number;
}

export interface DrainResult {
  attempted: number;
  delivered: number;
  retried: number;
  dropped: number;
  deadLettered: number;
  depth: number;
  queueAgeMs: number;
}

export interface MessagingMetrics {
  producerAccepted: number;
  producerRejected: number;
  consumerSucceeded: number;
  consumerFailed: number;
  retries: number;
  dropped: number;
  expired: number;
  deadLettered: number;
  queueAgeMs: number;
}

interface PendingDelivery extends DeliveryAttempt {
  sequence: number;
  availableAtMs: number;
  enqueuedAtMs: number;
}

const clampInteger = (value: number, minimum: number): number =>
  Math.max(minimum, Math.floor(Number.isFinite(value) ? value : minimum));

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export class MessagingModel {
  private pending: PendingDelivery[] = [];
  private deadLetters: PendingDelivery[] = [];
  private deliveredIds = new Set<string>();
  private sequence = 0;
  private fractionalDrainBudget = 0;
  private counters: Omit<MessagingMetrics, 'queueAgeMs'> = {
    producerAccepted: 0,
    producerRejected: 0,
    consumerSucceeded: 0,
    consumerFailed: 0,
    retries: 0,
    dropped: 0,
    expired: 0,
    deadLettered: 0,
  };

  constructor(private options: MessagingModelOptions) {}

  public enqueue(
    messageId: string,
    requestKey: string,
    nowMs: number,
    context: Pick<DeliveryAttempt, 'payloadSizeKb' | 'operationType'> = {},
  ): EnqueueResult {
    this.expireRetained(nowMs);
    const copies = this.getDeliveryCopies();
    const maxDepth = clampInteger(this.options.maxDepth, 1);
    let dropped = 0;
    if (copies > maxDepth) {
      this.counters.producerRejected++;
      this.counters.dropped += copies;
      return {
        accepted: false,
        depth: this.pending.length,
        acknowledgementLatencyMs: this.options.producerAckLatencyMs,
        partition: this.getPartition(requestKey),
        deliveryCopies: 0,
        dropped: copies,
      };
    }
    if (this.pending.length + copies > maxDepth && this.options.overflowPolicy === 'drop_oldest') {
      const required = Math.min(this.pending.length, this.pending.length + copies - maxDepth);
      this.pending.sort((left, right) => left.sequence - right.sequence);
      this.pending.splice(0, required);
      dropped = required;
      this.counters.dropped += required;
    }
    if (this.pending.length + copies > maxDepth) {
      this.counters.producerRejected++;
      this.counters.dropped += copies;
      return {
        accepted: false,
        depth: this.pending.length,
        acknowledgementLatencyMs: this.options.producerAckLatencyMs,
        partition: this.getPartition(requestKey),
        deliveryCopies: 0,
        dropped: copies,
      };
    }

    const partition = this.getPartition(requestKey);
    for (let recipientIndex = 0; recipientIndex < copies; recipientIndex++) {
      const sequence = this.sequence++;
      this.pending.push({
        deliveryId: `${messageId}:${recipientIndex}`,
        messageId,
        requestKey,
        partition,
        recipientIndex,
        attempt: 0,
        ...context,
        sequence,
        availableAtMs: nowMs,
        enqueuedAtMs: nowMs,
      });
    }
    this.counters.producerAccepted++;

    return {
      accepted: true,
      depth: this.pending.length,
      acknowledgementLatencyMs: Math.max(0, this.options.producerAckLatencyMs),
      partition,
      deliveryCopies: copies,
      dropped,
    };
  }

  public drain(
    deltaMs: number,
    nowMs: number,
    workers: WorkerCapacity,
    deliver: (attempt: DeliveryAttempt) => boolean | DeliveryOutcome,
  ): DrainResult {
    this.expireRetained(nowMs);
    const budget = this.calculateBudget(deltaMs, workers);
    const result: DrainResult = {
      attempted: 0,
      delivered: 0,
      retried: 0,
      dropped: 0,
      deadLettered: 0,
      depth: this.pending.length,
      queueAgeMs: this.getQueueAgeMs(nowMs),
    };

    for (let count = 0; count < budget; count++) {
      const index = this.findNextEligibleIndex(nowMs);
      if (index < 0) break;
      const delivery = this.pending.splice(index, 1)[0];
      result.attempted++;

      if (
        this.options.deliveryGuarantee === 'exactly_once' &&
        this.deliveredIds.has(delivery.deliveryId)
      ) {
        result.delivered++;
        continue;
      }

      const outcome = deliver({ ...delivery, attempt: delivery.attempt + 1 });
      const succeeded = typeof outcome === 'boolean' ? outcome : outcome.success;
      if (succeeded) {
        this.deliveredIds.add(delivery.deliveryId);
        result.delivered++;
        this.counters.consumerSucceeded++;
        continue;
      }

      this.counters.consumerFailed++;

      const nextAttempt = delivery.attempt + 1;
      const retryable = this.options.deliveryGuarantee !== 'at_most_once';
      const consumerRetryLimit =
        typeof outcome === 'boolean' || outcome.retryLimit === undefined
          ? clampInteger(this.options.retryLimit, 0)
          : Math.min(clampInteger(this.options.retryLimit, 0), clampInteger(outcome.retryLimit, 0));
      if (retryable && nextAttempt <= consumerRetryLimit) {
        const retryDelay =
          Math.max(0, this.options.retryDelayMs) * 2 ** Math.max(0, nextAttempt - 1);
        this.pending.push({
          ...delivery,
          attempt: nextAttempt,
          availableAtMs: nowMs + retryDelay,
        });
        result.retried++;
        this.counters.retries++;
      } else if (this.options.deadLetterQueue) {
        this.deadLetters.push({ ...delivery, attempt: nextAttempt });
        result.deadLettered++;
        this.counters.deadLettered++;
      } else {
        result.dropped++;
        this.counters.dropped++;
      }
    }

    result.depth = this.pending.length;
    result.queueAgeMs = this.getQueueAgeMs(nowMs);
    return result;
  }

  public getDepth(): number {
    return this.pending.length;
  }

  public getDeadLetterDepth(): number {
    return this.deadLetters.length;
  }

  public getMetrics(nowMs: number): MessagingMetrics {
    this.expireRetained(nowMs);
    return { ...this.counters, queueAgeMs: this.getQueueAgeMs(nowMs) };
  }

  public getPartitions(): number {
    return clampInteger(this.options.partitions, 1);
  }

  public reset(): void {
    this.pending = [];
    this.deadLetters = [];
    this.deliveredIds.clear();
    this.sequence = 0;
    this.fractionalDrainBudget = 0;
    this.counters = {
      producerAccepted: 0,
      producerRejected: 0,
      consumerSucceeded: 0,
      consumerFailed: 0,
      retries: 0,
      dropped: 0,
      expired: 0,
      deadLettered: 0,
    };
  }

  private getDeliveryCopies(): number {
    if (this.options.kind === 'message_queue') {
      return clampInteger(this.options.consumerGroups, 1);
    }
    if (this.options.kind === 'pubsub') {
      return clampInteger(this.options.subscribersPerTopic, 1);
    }
    if (this.options.kind === 'event_bus') {
      return clampInteger(this.options.fanoutFactor, 1);
    }
    return 1;
  }

  private getPartition(requestKey: string): number {
    const partitions = this.getPartitions();
    if (this.options.orderingGuarantee === 'FIFO') return 0;
    if (this.options.orderingGuarantee === 'Partition Key') {
      return stableHash(requestKey) % partitions;
    }
    return this.sequence % partitions;
  }

  private calculateBudget(deltaMs: number, workers: WorkerCapacity): number {
    const replicas = clampInteger(workers.replicas, 1);
    const concurrency = clampInteger(workers.concurrencyLimit, 1) * replicas;
    const workerRate = Math.max(0, workers.processingRatePerSec) * replicas;
    const latencyRate =
      (concurrency * 1000) / Math.max(1, this.options.consumerProcessingLatencyMs);
    const populatedPartitions = new Set(this.pending.map((delivery) => delivery.partition)).size;
    const activePartitions =
      this.options.orderingGuarantee === 'FIFO'
        ? 1
        : Math.min(this.getPartitions(), concurrency, Math.max(1, populatedPartitions));
    const partitionRate =
      Math.max(0, this.options.throughputPerPartitionPerSec) * Math.max(1, activePartitions);
    const rate = Math.min(workerRate, latencyRate, partitionRate);
    this.fractionalDrainBudget += (rate * Math.max(0, deltaMs)) / 1000;
    const budget = Math.floor(this.fractionalDrainBudget);
    this.fractionalDrainBudget -= budget;
    return budget;
  }

  private findNextEligibleIndex(nowMs: number): number {
    if (this.options.orderingGuarantee === 'None') {
      return this.pending.findIndex((delivery) => delivery.availableAtMs <= nowMs);
    }

    if (this.options.orderingGuarantee === 'FIFO') {
      let earliestIndex = -1;
      for (let index = 0; index < this.pending.length; index++) {
        if (
          earliestIndex < 0 ||
          this.pending[index].sequence < this.pending[earliestIndex].sequence
        ) {
          earliestIndex = index;
        }
      }
      return earliestIndex >= 0 && this.pending[earliestIndex].availableAtMs <= nowMs
        ? earliestIndex
        : -1;
    }

    const earliestByPartition = new Map<number, number>();
    for (let index = 0; index < this.pending.length; index++) {
      const delivery = this.pending[index];
      const current = earliestByPartition.get(delivery.partition);
      if (current === undefined || delivery.sequence < this.pending[current].sequence) {
        earliestByPartition.set(delivery.partition, index);
      }
    }
    return (
      [...earliestByPartition.values()]
        .filter((index) => this.pending[index].availableAtMs <= nowMs)
        .sort((left, right) => this.pending[left].sequence - this.pending[right].sequence)[0] ?? -1
    );
  }

  private expireRetained(nowMs: number): void {
    const retentionMs = Math.max(0, this.options.retentionMs);
    if (!Number.isFinite(retentionMs)) return;
    const retained = this.pending.filter(
      (delivery) => nowMs - delivery.enqueuedAtMs <= retentionMs,
    );
    const expired = this.pending.length - retained.length;
    if (expired > 0) {
      this.pending = retained;
      this.counters.expired += expired;
      this.counters.dropped += expired;
    }
  }

  private getQueueAgeMs(nowMs: number): number {
    if (this.pending.length === 0) return 0;
    let oldest = this.pending[0].enqueuedAtMs;
    for (let index = 1; index < this.pending.length; index++) {
      oldest = Math.min(oldest, this.pending[index].enqueuedAtMs);
    }
    return Math.max(0, nowMs - oldest);
  }
}
