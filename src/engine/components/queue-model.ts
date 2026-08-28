import { MessagingModel } from './messaging-model';

/** Backwards-compatible adapter for the original queue-model unit API. */
export class QueueModel {
  private model: MessagingModel;
  private nowMs = 0;

  constructor(
    maxDepth: number = 50000,
    private consumerRatePerSec: number = 2000,
    private partitions: number = 8
  ) {
    this.model = new MessagingModel({
      kind: 'message_queue',
      maxDepth,
      partitions,
      consumerGroups: 1,
      subscribersPerTopic: 1,
      fanoutFactor: 1,
      throughputPerPartitionPerSec: consumerRatePerSec,
      producerAckLatencyMs: 4,
      consumerProcessingLatencyMs: 10,
      deliveryGuarantee: 'at_least_once',
      orderingGuarantee: 'Partition Key',
      retryLimit: 0,
      retryDelayMs: 0,
      deadLetterQueue: false,
      retentionMs: Number.POSITIVE_INFINITY,
      overflowPolicy: 'reject_newest',
    });
  }

  public enqueue(): { accepted: boolean; depth: number } {
    const result = this.model.enqueue(`legacy-${this.nowMs}-${this.model.getDepth()}`, 'legacy', this.nowMs);
    return { accepted: result.accepted, depth: result.depth };
  }

  public drain(deltaMs: number): void {
    this.nowMs += deltaMs;
    this.model.drain(deltaMs, this.nowMs, {
      replicas: 1,
      concurrencyLimit: this.partitions,
      processingRatePerSec: this.consumerRatePerSec,
    }, () => true);
  }

  public getDepth(): number {
    return this.model.getDepth();
  }

  public getPartitions(): number {
    return this.model.getPartitions();
  }

  public reset(): void {
    this.nowMs = 0;
    this.model.reset();
  }
}
