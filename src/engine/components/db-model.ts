export class DatabaseModel {
  private activeConnections = 0;

  constructor(
    private baseLatencyMs: number = 20,
    private maxConnections: number = 500,
    private readReplicas: number = 2
  ) {}

  public executeQuery(isWrite: boolean = false): { latencyMs: number; poolExhausted: boolean } {
    if (this.activeConnections >= this.maxConnections) {
      // Connection pool saturated, introduce connection queue delay
      const saturatedLatency = this.baseLatencyMs * 2.5 + Math.random() * 20;
      return { latencyMs: Math.round(saturatedLatency), poolExhausted: true };
    }

    this.activeConnections++;
    // Reads spread across read replicas have lower concurrency contention
    const replicaFactor = !isWrite && this.readReplicas > 0 ? 1 / (1 + this.readReplicas * 0.3) : 1;
    const latency = Math.max(2, this.baseLatencyMs * replicaFactor + (Math.random() * 4 - 2));

    // Release connection after virtual query completion
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
      }, Math.min(50, Math.round(latency)));
    } else {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    }

    return { latencyMs: Math.round(latency), poolExhausted: false };
  }

  public getActiveConnections(): number {
    return this.activeConnections;
  }

  public reset(): void {
    this.activeConnections = 0;
  }
}
