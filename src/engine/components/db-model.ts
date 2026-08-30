import { NodeHealthStatus, SqlDbConfig } from '../../model/types';
import { createRandom } from '../seeded-random';

export interface DatabaseQueryResult {
  latencyMs: number;
  poolExhausted: boolean;
  rejected: boolean;
  role: 'primary' | 'read_replica';
  replicaIndex?: number;
  connectionWaitMs: number;
  replicationLagMs: number;
  failedOver: boolean;
  shardIndex: number;
}

interface DatabaseOptions {
  isolationLevel?: SqlDbConfig['isolationLevel'];
  connectionQueueLimit?: number;
  replicationLagMs?: number;
  automaticFailover?: boolean;
  failoverLatencyMs?: number;
  shardCount?: number;
}

const hashKey = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** SQL semantics are deliberately single-primary; degraded automatic failover promotes one standby. */
export class DatabaseModel {
  private activeConnections = 0;
  private queuedConnections = 0;
  private readReplicaIndex = 0;
  private reads = 0;
  private writes = 0;
  private primaryQueries = 0;
  private replicaQueries = 0;
  private connectionWaits = 0;
  private connectionRejections = 0;
  private connectionWaitMs = 0;
  private failovers = 0;
  private failoverPerformed = false;
  private shardHits: number[];

  constructor(
    private baseLatencyMs: number = 20,
    private maxConnections: number = 500,
    private readReplicas: number = 2,
    private random: () => number = createRandom(),
    private options: DatabaseOptions = {},
  ) {
    this.shardHits = Array.from({ length: Math.max(1, options.shardCount || 1) }, () => 0);
  }

  public executeQuery(
    isWrite: boolean = false,
    requestKey: string = 'default',
    health: NodeHealthStatus = 'healthy',
  ): DatabaseQueryResult {
    if (isWrite) this.writes++; else this.reads++;
    const isolation = this.options.isolationLevel || 'Read Committed';
    const latencyFactor = isolation === 'Serializable' ? 1.4 : isolation === 'Repeatable Read' ? 1.15 : 1;
    const capacityFactor = isolation === 'Serializable' ? 0.6 : isolation === 'Repeatable Read' ? 0.8 : 1;
    const effectiveConnections = Math.max(1, Math.floor(this.maxConnections * capacityFactor));
    const queueLimit = Math.max(0, this.options.connectionQueueLimit ?? this.maxConnections);
    const failedOver = health === 'degraded' && Boolean(this.options.automaticFailover) && !this.failoverPerformed;
    if (failedOver) {
      this.failovers++;
      this.failoverPerformed = true;
    }

    const useReplica = !isWrite && this.readReplicas > 0;
    const replicaIndex = useReplica ? this.readReplicaIndex++ % this.readReplicas : undefined;
    if (useReplica) this.replicaQueries++; else this.primaryQueries++;

    const shardIndex = hashKey(requestKey) % this.shardHits.length;
    this.shardHits[shardIndex]++;
    const routing = {
      role: useReplica ? 'read_replica' as const : 'primary' as const,
      replicaIndex,
      replicationLagMs: useReplica ? Math.max(0, this.options.replicationLagMs || 0) : 0,
      failedOver,
      shardIndex,
    };

    if (this.activeConnections >= effectiveConnections) {
      if (this.queuedConnections >= queueLimit) {
        this.connectionRejections++;
        return { ...routing, latencyMs: 1, poolExhausted: true, rejected: true, connectionWaitMs: 0 };
      }
      this.queuedConnections++;
      this.connectionWaits++;
      const waitMs = this.baseLatencyMs * (1 + this.queuedConnections / effectiveConnections);
      this.connectionWaitMs += waitMs;
      return {
        ...routing,
        latencyMs: Math.round(waitMs + this.baseLatencyMs * latencyFactor),
        poolExhausted: true,
        rejected: false,
        connectionWaitMs: Math.round(waitMs),
      };
    }

    this.activeConnections++;
    const replicaFactor = useReplica ? 1 / (1 + this.readReplicas * 0.3) : 1;
    const failoverLatency = failedOver ? Math.max(0, this.options.failoverLatencyMs || 0) : 0;
    const latency = Math.max(2, this.baseLatencyMs * replicaFactor * latencyFactor + failoverLatency + (this.random() * 4 - 2));
    return {
      ...routing,
      latencyMs: Math.round(latency),
      poolExhausted: false,
      rejected: false,
      connectionWaitMs: 0,
    };
  }

  public drainConnections(deltaMs: number): void {
    const releaseCount = Math.max(1, Math.round((this.activeConnections * deltaMs) / Math.max(10, this.baseLatencyMs)));
    this.activeConnections = Math.max(0, this.activeConnections - releaseCount);
    this.queuedConnections = Math.max(0, this.queuedConnections - releaseCount);
  }

  public getActiveConnections(): number { return this.activeConnections; }

  public getMetrics() {
    const total = this.shardHits.reduce((sum, count) => sum + count, 0);
    const hottest = this.shardHits.reduce((max, count) => Math.max(max, count), 0);
    const uniformShare = 100 / this.shardHits.length;
    const hotPartitionPercent = total > 0 ? Math.max(0, (hottest / total) * 100 - uniformShare) : 0;
    return {
      reads: this.reads,
      writes: this.writes,
      primaryQueries: this.primaryQueries,
      replicaQueries: this.replicaQueries,
      connectionWaits: this.connectionWaits,
      connectionRejections: this.connectionRejections,
      connectionWaitMs: this.connectionWaitMs,
      replicationLagMs: Math.max(0, this.options.replicationLagMs || 0),
      failovers: this.failovers,
      hotPartitionPercent,
      queuedConnections: this.queuedConnections,
    };
  }

  public reset(): void {
    this.activeConnections = 0;
    this.queuedConnections = 0;
    this.readReplicaIndex = 0;
    this.reads = 0;
    this.writes = 0;
    this.primaryQueries = 0;
    this.replicaQueries = 0;
    this.connectionWaits = 0;
    this.connectionRejections = 0;
    this.connectionWaitMs = 0;
    this.failovers = 0;
    this.failoverPerformed = false;
    this.shardHits.fill(0);
  }
}
