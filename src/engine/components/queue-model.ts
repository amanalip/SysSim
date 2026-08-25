export class QueueModel {
  private currentDepth = 0;

  constructor(
    private maxDepth: number = 50000,
    private consumerRatePerSec: number = 2000,
    private partitions: number = 8
  ) {}

  public enqueue(): { accepted: boolean; depth: number } {
    if (this.currentDepth >= this.maxDepth) {
      return { accepted: false, depth: this.currentDepth };
    }
    this.currentDepth++;
    return { accepted: true, depth: this.currentDepth };
  }

  public drain(deltaMs: number): void {
    const drainCount = Math.round((this.consumerRatePerSec * deltaMs) / 1000);
    this.currentDepth = Math.max(0, this.currentDepth - drainCount);
  }

  public getDepth(): number {
    return this.currentDepth;
  }

  public getPartitions(): number {
    return this.partitions;
  }
}
