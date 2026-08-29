import { describe, expect, it } from 'vitest';
import { createSimRequest } from '../engine/request';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import {
  GraphDbConfig,
  NoSqlDbConfig,
  ObjectStorageConfig,
  SearchIndexConfig,
  SimRequest,
  SqlDbConfig,
  TimeSeriesDbConfig,
} from '../model/types';

const traffic = { pattern: 'steady' as const, baseQps: 0, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 41 };
const execute = (engine: SysSimEngine, id: number, operationType: 'read' | 'write' = 'read', key = `key-${id}`, payloadSizeKb = 0, timestamp = 0) => {
  const request = createSimRequest('storage', timestamp, key, id, { operationType, payloadSizeKb });
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};
const engineFor = <T extends SqlDbConfig | NoSqlDbConfig | ObjectStorageConfig | SearchIndexConfig | GraphDbConfig | TimeSeriesDbConfig>(config: T) =>
  new SysSimEngine({ nodes: [{ id: 'storage', config }], edges: [] } satisfies SimGraph, traffic);

describe('SQL tasks 121-125', () => {
  const sql = (overrides: Partial<SqlDbConfig> = {}): SqlDbConfig => ({
    ...(createDefaultConfig('sql_db', 'storage') as SqlDbConfig),
    readReplicasCount: 2,
    ...overrides,
  });

  it('keeps writes on one primary and reports bounded connection waits and rejection', () => {
    const engine = engineFor(sql({ maxConnections: 1, connectionQueueLimit: 1 }));
    expect(execute(engine, 1, 'write').path[0].info).toContain('routed to primary');
    expect(execute(engine, 2, 'write').path[0].info).toContain('connection wait');
    expect(execute(engine, 3, 'write').status).toBe('dropped');
    expect(engine.getMetricsSnapshot().componentMetrics.storage).toMatchObject({
      sqlWrites: 3,
      sqlPrimaryQueries: 3,
      sqlConnectionWaits: 1,
      sqlConnectionRejections: 1,
    });
  });

  it('applies isolation tradeoffs, replica lag, degraded failover, and key sharding', () => {
    const committed = engineFor(sql({ readReplicasCount: 0, isolationLevel: 'Read Committed' }));
    const serializable = engineFor(sql({ readReplicasCount: 0, isolationLevel: 'Serializable' }));
    expect(execute(serializable, 1, 'write').totalLatencyMs).toBeGreaterThan(execute(committed, 1, 'write').totalLatencyMs);

    const storage = engineFor(sql({ health: 'degraded', replicationLagMs: 75, failoverLatencyMs: 200, shardCount: 4, shardingKey: 'tenant_id' }));
    const failoverRead = execute(storage, 1, 'read', 'tenant-a').path[0].info;
    expect(failoverRead).toContain('75ms replica lag');
    expect(failoverRead).toContain('automatic failover');
    expect(execute(storage, 2, 'write', 'tenant-a').path[0].info).toContain('routed to primary');
    execute(storage, 3, 'read', 'tenant-a');
    const metrics = storage.getMetricsSnapshot().componentMetrics.storage;
    expect(metrics.sqlFailovers).toBe(1);
    expect(metrics.sqlHotPartitionPercent).toBeGreaterThan(0);
  });
});

describe('NoSQL tasks 126-129', () => {
  const nosql = (overrides: Partial<NoSqlDbConfig> = {}): NoSqlDbConfig => ({
    ...(createDefaultConfig('nosql_db', 'storage') as NoSqlDbConfig), replicas: 3, partitionCount: 4, replicationLagMs: 20, ...overrides,
  });

  it('derives quorum and lag from consistency while hashing the configured partition key', () => {
    const strong = engineFor(nosql({ consistencyLevel: 'strong' }));
    const eventual = engineFor(nosql({ consistencyLevel: 'eventual' }));
    expect(execute(strong, 1, 'read', 'tenant-a').path[0].info).toContain('R=2, W=2, N=3');
    expect(execute(eventual, 1, 'read', 'tenant-a').path[0].info).toContain('R=1, W=1, N=3');
    expect(execute(strong, 2).totalLatencyMs).toBeGreaterThan(execute(eventual, 2).totalLatencyMs);
    for (let index = 0; index < 6; index++) execute(eventual, index + 10, 'read', 'one-hot-key');
    expect(eventual.getMetricsSnapshot().componentMetrics.storage).toMatchObject({
      nosqlReadQuorum: 1,
      nosqlWriteQuorum: 1,
      nosqlReplicationLagMs: 20,
    });
    expect(eventual.getMetricsSnapshot().componentMetrics.storage.nosqlHotPartitionPercent).toBeGreaterThan(0);
  });
});

describe('object storage tasks 130-132', () => {
  it('separates storage-class request overhead from payload transfer time', () => {
    const config = { ...(createDefaultConfig('object_storage', 'storage') as ObjectStorageConfig), latencyMs: 40, throughputMbPerSec: 10, storageClass: 'Infrequent' as const };
    const engine = engineFor(config);
    const request = execute(engine, 1, 'read', 'object', 1024);
    expect(request.path[0]).toMatchObject({ latencyMs: 160 });
    expect(request.path[0].info).toContain('60ms request + 100ms transfer');
    expect(engine.getMetricsSnapshot().componentMetrics.storage).toMatchObject({
      objectStorageRequestLatencyMs: 60,
      objectStorageTransferLatencyMs: 100,
      objectStorageTransferredKb: 1024,
    });
  });
});

describe('search tasks 133-136', () => {
  it('uses shard/replica topology and separates indexing from query latency and workload', () => {
    const config = { ...(createDefaultConfig('search_index', 'storage') as SearchIndexConfig), shards: 4, replicas: 2, queryLatencyMs: 10, indexingLatencyMs: 50 };
    const engine = engineFor(config);
    const query = execute(engine, 1, 'read', 'same');
    const indexing = execute(engine, 2, 'write', 'same');
    expect(indexing.totalLatencyMs).toBeGreaterThan(query.totalLatencyMs);
    expect(query.path[0].info).toContain('Search query on shard');
    expect(indexing.path[0].info).toContain('Index write on shard');
    expect(engine.getMetricsSnapshot().componentMetrics.storage).toMatchObject({ searchQueries: 1, searchIndexWrites: 1 });
    expect(engine.getMetricsSnapshot().componentMetrics.storage.searchShardImbalancePercent).toBeGreaterThan(0);
  });
});

describe('graph tasks 137-138', () => {
  it('clamps traversal depth and applies super-linear depth latency', () => {
    const shallow = engineFor({ ...(createDefaultConfig('graph_db', 'storage') as GraphDbConfig), queryLatencyMs: 10, traversalDepth: 1, traversalDepthLimit: 3 });
    const limited = engineFor({ ...(createDefaultConfig('graph_db', 'storage') as GraphDbConfig), queryLatencyMs: 10, traversalDepth: 5, traversalDepthLimit: 3 });
    expect(execute(limited, 1).totalLatencyMs).toBeGreaterThan(execute(shallow, 1).totalLatencyMs);
    expect(limited.getMetricsSnapshot().componentMetrics.storage).toMatchObject({ graphTraversalDepth: 3, graphDepthLimitedQueries: 1 });

    const constrained = engineFor({ ...(createDefaultConfig('graph_db', 'storage') as GraphDbConfig), traversalDepth: 3, traversalDepthLimit: 3, maxThroughputQps: 4 });
    expect(execute(constrained, 1, 'read', 'one', 0, 100).status).toBe('success');
    expect(execute(constrained, 2, 'read', 'two', 0, 200).status).toBe('dropped');
    expect(constrained.getMetricsSnapshot().componentMetrics.storage.graphCapacityRejectedQueries).toBe(1);
  });
});

describe('time-series tasks 139-140', () => {
  it('enforces the per-second write ceiling and applies retention to query latency', () => {
    const shortRetention = engineFor({ ...(createDefaultConfig('timeseries_db', 'storage') as TimeSeriesDbConfig), writeThroughputPerSec: 1, queryLatencyMs: 10, retentionDays: 30 });
    expect(execute(shortRetention, 1, 'write', 'one', 0, 100).status).toBe('success');
    expect(execute(shortRetention, 2, 'write', 'two', 0, 200).status).toBe('dropped');
    const shortQuery = execute(shortRetention, 3, 'read').totalLatencyMs;
    const longRetention = engineFor({ ...(createDefaultConfig('timeseries_db', 'storage') as TimeSeriesDbConfig), queryLatencyMs: 10, retentionDays: 120 });
    expect(execute(longRetention, 1, 'read').totalLatencyMs).toBeGreaterThan(shortQuery);
    expect(shortRetention.getMetricsSnapshot().componentMetrics.storage).toMatchObject({
      timeSeriesAcceptedWrites: 1,
      timeSeriesRejectedWrites: 1,
      timeSeriesQueries: 1,
      timeSeriesRetentionDays: 30,
    });
  });
});
