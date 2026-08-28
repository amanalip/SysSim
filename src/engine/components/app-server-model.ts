export interface AppServerServiceResult {
  processingLatencyMs: number;
  queueLatencyMs: number;
  totalLatencyMs: number;
}

/**
 * Deterministic fixed-service-time replica model. Each replica owns one service
 * slot. Replicas add slots; they never reduce the configured processing time.
 * maxThroughputQps caps how frequently each slot can accept new work.
 */
export class AppServerModel {
  private slotAvailableAtMs: number[];

  constructor(
    private replicas: number,
    private processingLatencyMs: number,
    private maxThroughputPerReplicaQps: number,
  ) {
    this.slotAvailableAtMs = Array.from({ length: this.replicaCount }, () => 0);
  }

  public process(arrivalTimeMs: number): AppServerServiceResult {
    let selected = 0;
    for (let index = 1; index < this.slotAvailableAtMs.length; index++) {
      if (this.slotAvailableAtMs[index] < this.slotAvailableAtMs[selected]) selected = index;
    }

    const processingLatencyMs = Math.max(0, this.processingLatencyMs);
    const throughputIntervalMs = this.maxThroughputPerReplicaQps > 0
      ? 1000 / this.maxThroughputPerReplicaQps
      : Number.POSITIVE_INFINITY;
    const slotOccupancyMs = Math.max(processingLatencyMs, throughputIntervalMs);
    const serviceStartMs = Math.max(arrivalTimeMs, this.slotAvailableAtMs[selected]);
    const queueLatencyMs = Math.max(0, serviceStartMs - arrivalTimeMs);
    this.slotAvailableAtMs[selected] = serviceStartMs + slotOccupancyMs;

    return {
      processingLatencyMs,
      queueLatencyMs,
      totalLatencyMs: processingLatencyMs + queueLatencyMs,
    };
  }

  public reset(): void {
    this.slotAvailableAtMs = Array.from({ length: this.replicaCount }, () => 0);
  }

  private get replicaCount(): number {
    return Math.max(1, Math.floor(Number.isFinite(this.replicas) ? this.replicas : 1));
  }
}
