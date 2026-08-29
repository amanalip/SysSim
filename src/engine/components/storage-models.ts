import {
  GraphDbConfig,
  NoSqlDbConfig,
  ObjectStorageConfig,
  SearchIndexConfig,
  TimeSeriesDbConfig,
} from '../../model/types';

const hashKey = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const imbalancePercent = (hits: number[]): number => {
  const total = hits.reduce((sum, count) => sum + count, 0);
  if (total === 0 || hits.length === 0) return 0;
  const uniformShare = 100 / hits.length;
  const hottestShare = (Math.max(...hits) / total) * 100;
  return Math.max(0, hottestShare - uniformShare);
};

export class NoSqlDatabaseModel {
  private reads = 0;
  private writes = 0;
  private partitionHits: number[];

  constructor(private config: NoSqlDbConfig) {
    this.partitionHits = Array.from({ length: Math.max(1, config.partitionCount) }, () => 0);
  }

  public execute(isWrite: boolean, requestKey: string) {
    if (isWrite) this.writes++; else this.reads++;
    const replicas = Math.max(1, this.config.replicas);
    const majority = Math.floor(replicas / 2) + 1;
    const consistency = this.config.consistencyLevel;
    const readQuorum = consistency === 'strong' || consistency === 'bounded_staleness' ? majority : 1;
    const writeQuorum = consistency === 'eventual' ? 1 : majority;
    const latencyFactor = consistency === 'strong' ? 1.5 : consistency === 'bounded_staleness' ? 1.25 : consistency === 'session' ? 1.1 : 1;
    const quorum = isWrite ? writeQuorum : readQuorum;
    const partitionIndex = hashKey(requestKey) % this.partitionHits.length;
    this.partitionHits[partitionIndex]++;
    const visibleLagMs = isWrite || consistency === 'strong'
      ? 0
      : consistency === 'bounded_staleness'
        ? this.config.replicationLagMs / 2
        : consistency === 'session'
          ? this.config.replicationLagMs / 4
          : this.config.replicationLagMs;
    return {
      latencyMs: Math.max(1, Math.round(this.config.baseLatencyMs * latencyFactor * (1 + (quorum - 1) * 0.15))),
      readQuorum,
      writeQuorum,
      visibleLagMs,
      partitionIndex,
    };
  }

  public getMetrics() {
    const majority = Math.floor(Math.max(1, this.config.replicas) / 2) + 1;
    const visibleLag = this.config.consistencyLevel === 'strong'
      ? 0
      : this.config.consistencyLevel === 'bounded_staleness'
        ? this.config.replicationLagMs / 2
        : this.config.consistencyLevel === 'session'
          ? this.config.replicationLagMs / 4
          : this.config.replicationLagMs;
    return {
      reads: this.reads,
      writes: this.writes,
      readQuorum: this.config.consistencyLevel === 'strong' || this.config.consistencyLevel === 'bounded_staleness' ? majority : 1,
      writeQuorum: this.config.consistencyLevel === 'eventual' ? 1 : majority,
      replicationLagMs: visibleLag,
      hotPartitionPercent: imbalancePercent(this.partitionHits),
    };
  }

  public reset() { this.reads = 0; this.writes = 0; this.partitionHits.fill(0); }
}

export class ObjectStorageModel {
  private requests = 0;
  private requestLatencyMs = 0;
  private transferLatencyMs = 0;
  private transferredKb = 0;

  constructor(private config: ObjectStorageConfig) {}

  public execute(payloadSizeKb: number) {
    const classFactor = this.config.storageClass === 'Glacier' ? 20 : this.config.storageClass === 'Infrequent' ? 1.5 : 1;
    const requestLatencyMs = Math.max(0, this.config.latencyMs) * classFactor;
    const transferLatencyMs = this.config.throughputMbPerSec > 0
      ? (Math.max(0, payloadSizeKb) / 1024 / this.config.throughputMbPerSec) * 1000
      : 0;
    this.requests++;
    this.requestLatencyMs += requestLatencyMs;
    this.transferLatencyMs += transferLatencyMs;
    this.transferredKb += Math.max(0, payloadSizeKb);
    return { latencyMs: requestLatencyMs + transferLatencyMs, requestLatencyMs, transferLatencyMs };
  }

  public getMetrics() {
    return {
      requestLatencyMs: this.requests ? this.requestLatencyMs / this.requests : 0,
      transferLatencyMs: this.requests ? this.transferLatencyMs / this.requests : 0,
      transferredKb: this.transferredKb,
    };
  }

  public reset() { this.requests = 0; this.requestLatencyMs = 0; this.transferLatencyMs = 0; this.transferredKb = 0; }
}

export class SearchIndexModel {
  private queries = 0;
  private indexWrites = 0;
  private shardHits: number[];

  constructor(private config: SearchIndexConfig) {
    this.shardHits = Array.from({ length: Math.max(1, config.shards) }, () => 0);
  }

  public execute(isWrite: boolean, requestKey: string) {
    const shardIndex = hashKey(requestKey) % this.shardHits.length;
    this.shardHits[shardIndex]++;
    if (isWrite) {
      this.indexWrites++;
      return { latencyMs: this.config.indexingLatencyMs * (1 + Math.max(0, this.config.replicas) * 0.12), shardIndex, operation: 'index' as const };
    }
    this.queries++;
    return {
      latencyMs: this.config.queryLatencyMs * (1 + Math.log2(Math.max(1, this.config.shards)) * 0.08) / Math.sqrt(Math.max(1, this.config.replicas + 1)),
      shardIndex,
      operation: 'query' as const,
    };
  }

  public getMetrics() { return { queries: this.queries, indexWrites: this.indexWrites, shardImbalancePercent: imbalancePercent(this.shardHits) }; }
  public reset() { this.queries = 0; this.indexWrites = 0; this.shardHits.fill(0); }
}

export class GraphDatabaseModel {
  private queries = 0;
  private depthLimitedQueries = 0;
  private depthTotal = 0;
  private capacityRejectedQueries = 0;
  private bucket = -1;
  private bucketQueries = 0;

  constructor(private config: GraphDbConfig) {}

  public execute(elapsedMs: number) {
    const requestedDepth = Math.max(1, this.config.traversalDepth);
    const actualDepth = Math.min(requestedDepth, Math.max(1, this.config.traversalDepthLimit));
    const limited = requestedDepth > actualDepth;
    const depthCost = Math.pow(actualDepth, 1.35);
    const effectiveCapacityQps = Math.max(1, Math.floor((this.config.maxThroughputQps || 1) / depthCost));
    const nextBucket = Math.floor(elapsedMs / 1000);
    if (nextBucket !== this.bucket) { this.bucket = nextBucket; this.bucketQueries = 0; }
    if (this.bucketQueries >= effectiveCapacityQps) {
      this.capacityRejectedQueries++;
      return { accepted: false, latencyMs: 1, actualDepth, requestedDepth, limited, effectiveCapacityQps };
    }
    this.bucketQueries++;
    this.queries++;
    this.depthTotal += actualDepth;
    if (limited) this.depthLimitedQueries++;
    return { accepted: true, latencyMs: this.config.queryLatencyMs * depthCost, actualDepth, requestedDepth, limited, effectiveCapacityQps };
  }

  public getMetrics() {
    const averageDepth = this.queries ? this.depthTotal / this.queries : 0;
    return {
      averageDepth,
      depthLimitedQueries: this.depthLimitedQueries,
      effectiveCapacityQps: Math.max(1, Math.floor((this.config.maxThroughputQps || 1) / Math.pow(Math.max(1, averageDepth || this.config.traversalDepth), 1.35))),
      capacityRejectedQueries: this.capacityRejectedQueries,
    };
  }
  public reset() { this.queries = 0; this.depthLimitedQueries = 0; this.depthTotal = 0; this.capacityRejectedQueries = 0; this.bucket = -1; this.bucketQueries = 0; }
}

export class TimeSeriesDatabaseModel {
  private bucket = -1;
  private bucketWrites = 0;
  private acceptedWrites = 0;
  private rejectedWrites = 0;
  private queries = 0;

  constructor(private config: TimeSeriesDbConfig) {}

  public execute(isWrite: boolean, elapsedMs: number) {
    if (!isWrite) {
      this.queries++;
      const retentionScanFactor = Math.max(1, Math.sqrt(Math.max(1, this.config.retentionDays) / 30));
      return { accepted: true, latencyMs: this.config.queryLatencyMs * retentionScanFactor, retentionScanFactor };
    }
    const nextBucket = Math.floor(elapsedMs / 1000);
    if (nextBucket !== this.bucket) { this.bucket = nextBucket; this.bucketWrites = 0; }
    if (this.bucketWrites >= Math.max(0, this.config.writeThroughputPerSec)) {
      this.rejectedWrites++;
      return { accepted: false, latencyMs: 1, retentionScanFactor: 1 };
    }
    this.bucketWrites++;
    this.acceptedWrites++;
    return { accepted: true, latencyMs: Math.max(1, this.config.queryLatencyMs * 0.25), retentionScanFactor: 1 };
  }

  public getMetrics() {
    return { acceptedWrites: this.acceptedWrites, rejectedWrites: this.rejectedWrites, queries: this.queries, retentionDays: this.config.retentionDays };
  }
  public reset() { this.bucket = -1; this.bucketWrites = 0; this.acceptedWrites = 0; this.rejectedWrites = 0; this.queries = 0; }
}
