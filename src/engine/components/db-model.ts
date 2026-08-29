export class DatabaseModel {
  private activeConnections = 0;
  private readReplicaIndex = 0;
  private reads = 0;
  private writes = 0;
  private primaryQueries = 0;
  private replicaQueries = 0;

  constructor(
    private baseLatencyMs: number = 20,
    private maxConnections: number = 500,
    private readReplicas: number = 2,
    private random: () => number = Math.random,
  ) {}

  public executeQuery(isWrite: boolean = false): {
    latencyMs: number; poolExhausted: boolean; role: 'primary' | 'read_replica'; replicaIndex?: number;
  } {
    if (isWrite) this.writes++; else this.reads++;
    const useReplica = !isWrite && this.readReplicas > 0;
    const replicaIndex = useReplica ? this.readReplicaIndex++ % this.readReplicas : undefined;
    if (useReplica) this.replicaQueries++; else this.primaryQueries++;
    if (this.activeConnections >= this.maxConnections) {
      // Connection pool saturated, introduce connection queue delay
      const saturatedLatency = this.baseLatencyMs * 2.5 + this.random() * 20;
      return { latencyMs: Math.round(saturatedLatency), poolExhausted: true, role: useReplica ? 'read_replica' : 'primary', replicaIndex };
    }

    this.activeConnections++;
    // Reads spread across read replicas have lower concurrency contention
    const replicaFactor = !isWrite && this.readReplicas > 0 ? 1 / (1 + this.readReplicas * 0.3) : 1;
    const latency = Math.max(2, this.baseLatencyMs * replicaFactor + (this.random() * 4 - 2));

    return { latencyMs: Math.round(latency), poolExhausted: false, role: useReplica ? 'read_replica' : 'primary', replicaIndex };
  }

  public drainConnections(deltaMs: number): void {
    const releaseCount = Math.max(1, Math.round((this.activeConnections * deltaMs) / Math.max(10, this.baseLatencyMs)));
    this.activeConnections = Math.max(0, this.activeConnections - releaseCount);
  }

  public getActiveConnections(): number {
    return this.activeConnections;
  }

  public getMetrics() { return { reads: this.reads, writes: this.writes, primaryQueries: this.primaryQueries, replicaQueries: this.replicaQueries }; }

  public reset(): void {
    this.activeConnections = 0;
    this.readReplicaIndex = 0;
    this.reads = 0;
    this.writes = 0;
    this.primaryQueries = 0;
    this.replicaQueries = 0;
  }
}
