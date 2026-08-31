export interface AppServerServiceResult {
  processingLatencyMs: number;
  queueLatencyMs: number;
  totalLatencyMs: number;
  activeConnections: number;
  queuedRequests: number;
  cpuUtilizationPercent: number;
  degraded: boolean;
}

export interface AppServerMetrics {
  activeConnections: number;
  queuedRequests: number;
  cpuUtilizationPercent: number;
  capacityQps: number;
}

/** Connections are per replica. Replicas add capacity, never speed up a request. */
export class AppServerModel {
  private slotAvailableAtMs: number[] = [];
  private replicaNextAdmissionAtMs: number[] = [];
  private arrivalTimesMs: number[] = [];
  private scheduledServiceStartsMs: number[] = [];

  constructor(
    private replicas: number,
    private processingLatencyMs: number,
    private maxThroughputPerReplicaQps: number,
    private maxConnectionsPerReplica = 1,
    private degraded = false,
  ) {
    this.reset();
  }

  public process(arrivalTimeMs: number): AppServerServiceResult {
    this.pruneArrivals(arrivalTimeMs);
    this.arrivalTimesMs.push(arrivalTimeMs);
    let selected = 0;
    let selectedStartMs = this.candidateStart(0, arrivalTimeMs);
    for (let index = 1; index < this.slotAvailableAtMs.length; index++) {
      const candidateStartMs = this.candidateStart(index, arrivalTimeMs);
      if (candidateStartMs < selectedStartMs) {
        selected = index;
        selectedStartMs = candidateStartMs;
      }
    }
    const processingLatencyMs = this.effectiveProcessingLatencyMs;
    const throughputIntervalMs =
      this.maxThroughputPerReplicaQps > 0
        ? 1000 / this.maxThroughputPerReplicaQps
        : Number.POSITIVE_INFINITY;
    const serviceStartMs = selectedStartMs;
    const queueLatencyMs = Math.max(0, serviceStartMs - arrivalTimeMs);
    if (queueLatencyMs > 0) this.scheduledServiceStartsMs.push(serviceStartMs);
    this.slotAvailableAtMs[selected] = serviceStartMs + processingLatencyMs;
    this.replicaNextAdmissionAtMs[this.replicaForSlot(selected)] =
      serviceStartMs + throughputIntervalMs;
    return {
      processingLatencyMs,
      queueLatencyMs,
      totalLatencyMs: processingLatencyMs + queueLatencyMs,
      ...this.getMetrics(arrivalTimeMs),
      degraded: this.degraded,
    };
  }

  public getMetrics(nowMs: number): AppServerMetrics {
    this.pruneArrivals(nowMs);
    const activeConnections = this.slotAvailableAtMs.filter(
      (availableAt) => availableAt > nowMs,
    ).length;
    this.scheduledServiceStartsMs = this.scheduledServiceStartsMs.filter(
      (startAt) => startAt > nowMs,
    );
    const queuedRequests = this.scheduledServiceStartsMs.length;
    const capacityQps = this.effectiveReplicaCount * Math.max(0, this.maxThroughputPerReplicaQps);
    const loadUtilization =
      capacityQps > 0 ? (this.arrivalTimesMs.length / capacityQps) * 100 : 100;
    const connectionUtilization = (activeConnections / this.slotAvailableAtMs.length) * 100;
    return {
      activeConnections,
      queuedRequests,
      cpuUtilizationPercent: Math.min(
        100,
        Math.round(Math.max(loadUtilization, connectionUtilization) * 10) / 10,
      ),
      capacityQps,
    };
  }

  public reset(): void {
    this.slotAvailableAtMs = Array.from({ length: this.connectionSlotCount }, () => 0);
    this.replicaNextAdmissionAtMs = Array.from({ length: this.effectiveReplicaCount }, () => 0);
    this.arrivalTimesMs = [];
    this.scheduledServiceStartsMs = [];
  }

  private pruneArrivals(nowMs: number): void {
    const threshold = nowMs - 1000;
    this.arrivalTimesMs = this.arrivalTimesMs.filter((timestamp) => timestamp > threshold);
  }

  private get effectiveProcessingLatencyMs(): number {
    return Math.max(0, this.processingLatencyMs) * (this.degraded ? 2 : 1);
  }

  private get effectiveReplicaCount(): number {
    const replicas = Math.max(1, Math.floor(Number.isFinite(this.replicas) ? this.replicas : 1));
    return this.degraded ? Math.max(1, Math.ceil(replicas / 2)) : replicas;
  }

  private get connectionSlotCount(): number {
    const connections = Math.max(
      1,
      Math.floor(
        Number.isFinite(this.maxConnectionsPerReplica) ? this.maxConnectionsPerReplica : 1,
      ),
    );
    return this.effectiveReplicaCount * connections;
  }

  private replicaForSlot(slotIndex: number): number {
    return Math.floor(slotIndex / this.connectionsPerReplica);
  }

  private candidateStart(slotIndex: number, arrivalTimeMs: number): number {
    const replica = this.replicaForSlot(slotIndex);
    return Math.max(
      arrivalTimeMs,
      this.slotAvailableAtMs[slotIndex],
      this.replicaNextAdmissionAtMs[replica],
    );
  }

  private get connectionsPerReplica(): number {
    return Math.max(
      1,
      Math.floor(
        Number.isFinite(this.maxConnectionsPerReplica) ? this.maxConnectionsPerReplica : 1,
      ),
    );
  }
}
