import { describe, expect, it } from 'vitest';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { createDefaultConfig } from '../model/component-defaults';
import { OverallMetrics, ProtocolEdgeData } from '../model/types';

const node = (id: string, type: Parameters<typeof createDefaultConfig>[0], patch: Record<string, unknown> = {}) => ({
  id, data: { config: { ...createDefaultConfig(type, id, id), ...patch } as ReturnType<typeof createDefaultConfig> },
});
const edge = (source: string, target: string, purpose: ProtocolEdgeData['purpose'] = 'request') => ({
  id: `${source}-${target}-${purpose}`, source, target, data: { protocol: 'HTTP' as const, purpose },
});
const metrics = (items: OverallMetrics['componentMetrics']): OverallMetrics => ({
  totalRequestsSent: 0, totalRequestsSuccess: 0, totalRequestsFailed: 0, currentQps: 0,
  avgEndToEndLatencyMs: 0, p50LatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0,
  overallErrorRatePercent: 0, overallCacheHitRatioPercent: 0, totalCacheHits: 0, totalCacheMisses: 0,
  totalCacheBypasses: 0, totalCacheCoalescedRequests: 0, totalProducerAccepted: 0, totalProducerRejected: 0,
  totalConsumerSucceeded: 0, totalConsumerFailed: 0, totalMessageRetries: 0, totalMessagesDropped: 0,
  totalMessagesExpired: 0, totalDeadLettered: 0, timeSeries: [], componentMetrics: items,
});
const metric = (id: string, type: Parameters<typeof createDefaultConfig>[0], extras: Record<string, unknown> = {}) => ({
  nodeId: id, nodeName: id, nodeType: type, qps: 1, avgLatencyMs: 0, p95LatencyMs: 0, errorRatePercent: 0,
  activeConnections: 0, queueDepth: 0, cacheHitRatioPercent: 0, utilizationPercent: 0, totalRequests: 2_000,
  successfulRequests: 2_000, failedRequests: 0, ...extras,
});

describe('graph-aware bottleneck detection tasks 263-275', () => {
  it('does not flag isolated or unused components', () => {
    const nodes = [node('client', 'client'), node('used', 'app_server', { replicas: 2 }), node('isolated', 'sql_db')];
    const issues = detectBottlenecks(nodes, [edge('client', 'used')]);
    expect(issues.some((issue) => issue.nodeId === 'isolated')).toBe(false);
  });

  it('finds a reachable dominating SPOF and ignores a redundant route', () => {
    const nodes = [node('client', 'client'), node('gateway', 'api_gateway'), node('app', 'app_server', { replicas: 2 }), node('db', 'sql_db', { replicas: 2 })];
    const linear = detectBottlenecks(nodes, [edge('client', 'gateway'), edge('gateway', 'app'), edge('app', 'db')]);
    expect(linear.find((issue) => issue.type === 'spof' && issue.nodeId === 'gateway')?.triggerPath).toEqual(['client', 'gateway']);
    const redundant = detectBottlenecks(nodes, [edge('client', 'gateway'), edge('client', 'app'), edge('gateway', 'db'), edge('app', 'db')]);
    expect(redundant.some((issue) => issue.type === 'spof' && issue.nodeId === 'gateway')).toBe(false);
  });

  it('requires a reachable read-heavy database path without a cache', () => {
    const readNodes = [node('client', 'client', { readPercentage: 80 }), node('app', 'app_server'), node('db', 'sql_db')];
    expect(detectBottlenecks(readNodes, [edge('client', 'app'), edge('app', 'db')]).some((issue) => issue.type === 'missing_cache')).toBe(true);
    const writeNodes = [node('client', 'client', { readPercentage: 10 }), node('app', 'app_server'), node('db', 'sql_db')];
    expect(detectBottlenecks(writeNodes, [edge('client', 'app'), edge('app', 'db')]).some((issue) => issue.type === 'missing_cache')).toBe(false);
    expect(detectBottlenecks(readNodes.concat(node('cache', 'redis_cache')), [edge('client', 'app'), edge('app', 'cache'), edge('cache', 'db')]).some((issue) => issue.type === 'missing_cache')).toBe(false);
  });

  it('traverses actual synchronous paths and excludes replication and observability links', () => {
    const nodes = ['client', 'a', 'b', 'c', 'd'].map((id, index) => node(id, index ? 'app_server' : 'client', { replicas: 2 }));
    const requestEdges = [edge('client', 'a'), edge('a', 'b'), edge('b', 'c'), edge('c', 'd')];
    expect(detectBottlenecks(nodes, requestEdges).some((issue) => issue.type === 'synchronous_chain')).toBe(true);
    const semanticEdges = [edge('client', 'a'), edge('a', 'b', 'replication'), edge('b', 'c', 'observability'), edge('c', 'd')];
    expect(detectBottlenecks(nodes, semanticEdges).some((issue) => issue.type === 'synchronous_chain')).toBe(false);
  });

  it('detects, deduplicates, explains, and ranks telemetry findings', () => {
    const nodes = [node('client', 'client'), node('lb', 'load_balancer'), node('db', 'sql_db', { connectionQueueLimit: 100 })];
    const observed = metrics({
      lb: metric('lb', 'load_balancer', { loadBalancerDistributionSkewPercent: 60 }),
      db: metric('db', 'sql_db', { qps: 3_000, queueDepth: 100, sqlHotPartitionPercent: 55 }),
    });
    const issues = detectBottlenecks(nodes, [edge('client', 'lb'), edge('lb', 'db')], observed);
    expect(issues.map((issue) => issue.type)).toEqual(expect.arrayContaining(['hot_partition', 'unbalanced_load', 'queue_overflow', 'capacity_overload']));
    expect(new Set(issues.map((issue) => `${issue.type}:${issue.nodeId}`)).size).toBe(issues.length);
    expect(issues[0].impactScore).toBeGreaterThanOrEqual(issues.at(-1)?.impactScore || 0);
    for (const issue of issues) {
      expect(issue.triggerPath?.length).toBeGreaterThan(0);
      expect(issue.description).toMatch(/client|Client|→|path/i);
      expect(issue.confidence).toBeDefined();
      expect(issue.affectedTrafficPercent).toBeGreaterThan(0);
    }
  });

  it('is cycle-safe', () => {
    const nodes = [node('client', 'client'), node('a', 'app_server'), node('b', 'app_server')];
    expect(() => detectBottlenecks(nodes, [edge('client', 'a'), edge('a', 'b'), edge('b', 'a')])).not.toThrow();
  });
});
