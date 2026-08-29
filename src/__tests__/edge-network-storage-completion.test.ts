import { describe, expect, it } from 'vitest';
import { createSimRequest } from '../engine/request';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import {
  AppServerConfig, CDNConfig, ClientConfig, DNSConfig, FirewallConfig,
  ReverseProxyConfig, SimRequest, SqlDbConfig,
} from '../model/types';

const traffic = { pattern: 'steady' as const, baseQps: 0, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 31 };
const edge = (id: string, source: string, target: string, latencyMs = 4) => ({ id, source, target, data: { protocol: 'HTTP' as const, purpose: 'request' as const, latencyMs } });
const app = (id: string, overrides: Partial<AppServerConfig> = {}): AppServerConfig => ({ ...(createDefaultConfig('app_server', id, id) as AppServerConfig), processingLatencyMs: 10, ...overrides });
const client = (id: string, overrides: Partial<ClientConfig> = {}): ClientConfig => ({ ...(createDefaultConfig('client', id, id) as ClientConfig), ...overrides });
const execute = (engine: SysSimEngine, source: string, id: number, timestamp = 0, key = `key-${id}`, operationType: 'read' | 'write' = 'read', payloadSizeKb = 0) => {
  const request = createSimRequest(source, timestamp, key, id, { operationType, payloadSizeKb });
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};

describe('CDN tasks 106-108', () => {
  const graph = (locations: number): SimGraph => ({
    nodes: [
      { id: 'client', config: client('client') },
      { id: 'cdn', config: { ...(createDefaultConfig('cdn', 'cdn') as CDNConfig), edgeLocationsCount: locations, hitRatioPercent: 100, cacheTtlSec: 60 } },
      { id: 'origin', config: app('origin') },
    ],
    edges: [edge('client-cdn', 'client', 'cdn'), edge('origin', 'cdn', 'origin')],
  });

  const warmAndHit = (locations: number) => {
    const engine = new SysSimEngine(graph(locations), traffic);
    const miss = execute(engine, 'client', 1, 0, 'asset', 'read', 64);
    engine.start(); engine.step(100);
    const hit = execute(engine, 'client', 2, 100, 'asset', 'read', 64);
    return { engine, miss, hit, cdnHop: hit.path.find((hop) => hop.nodeId === 'cdn')! };
  };

  it('separates edge-hit from origin-fetch latency using documented geography assumptions', () => {
    const sparse = warmAndHit(1);
    const dense = warmAndHit(64);
    expect(sparse.miss.path.some((hop) => hop.nodeId === 'origin')).toBe(true);
    expect(sparse.hit.path.some((hop) => hop.nodeId === 'origin')).toBe(false);
    expect(dense.cdnHop.latencyMs).toBeLessThan(sparse.cdnHop.latencyMs);
    expect(dense.cdnHop.info).toContain('nearest-edge assumption');
  });

  it('reports origin offload, fetch latency, and origin egress independently', () => {
    const { engine } = warmAndHit(16);
    expect(engine.getMetricsSnapshot().componentMetrics.cdn).toMatchObject({
      cdnOriginOffloadedRequests: 1,
      cdnOriginFetches: 1,
      cdnOriginEgressKb: 64,
    });
    expect(engine.getMetricsSnapshot().componentMetrics.cdn.cdnOriginFetchLatencyMs).toBeGreaterThan(0);
  });
});

describe('DNS tasks 109-111', () => {
  const dns = (overrides: Partial<DNSConfig> = {}): DNSConfig => ({ ...(createDefaultConfig('dns', 'dns') as DNSConfig), ttlSec: 1, lookupLatencyMs: 20, ...overrides });
  const graph = (config: DNSConfig): SimGraph => ({
    nodes: [{ id: 'client', config: client('client') }, { id: 'dns', config }, { id: 'a', config: app('a') }, { id: 'b', config: app('b') }],
    edges: [edge('client-dns', 'client', 'dns'), edge('a', 'dns', 'a', 30), edge('b', 'dns', 'b', 5)],
  });

  it('caches resolutions by TTL and forwards application traffic to only the selected address', () => {
    const engine = new SysSimEngine(graph(dns({ routingPolicy: 'simple' })), traffic);
    const first = execute(engine, 'client', 1, 0, 'host');
    const cached = execute(engine, 'client', 2, 500, 'host');
    const expired = execute(engine, 'client', 3, 1_100, 'host');
    expect(first.path.map((hop) => hop.nodeId)).toEqual(['client', 'dns', 'a']);
    expect(cached.path.find((hop) => hop.nodeId === 'dns')).toMatchObject({ latencyMs: 0.2 });
    expect(cached.path.find((hop) => hop.nodeId === 'dns')?.info).toContain('continues directly');
    expect(expired.path.find((hop) => hop.nodeId === 'dns')).toMatchObject({ latencyMs: 20 });
    expect(engine.getMetricsSnapshot().componentMetrics.dns).toMatchObject({ dnsCacheHits: 1, dnsCacheMisses: 2 });
  });

  it('implements simple, weighted, geolocation, and latency-based policies deterministically', () => {
    const latency = new SysSimEngine(graph(dns({ routingPolicy: 'latency_based' })), traffic);
    expect(execute(latency, 'client', 1).path.at(-1)?.nodeId).toBe('b');

    const weighted = new SysSimEngine(graph(dns({ routingPolicy: 'weighted', targetWeights: { a: 3, b: 1 }, ttlSec: 1 })), traffic);
    const weightedTargets = Array.from({ length: 8 }, (_, index) => execute(weighted, 'client', index, index * 1_001, `host-${index}`).path.at(-1)?.nodeId);
    expect(weightedTargets.filter((target) => target === 'a')).toHaveLength(6);
    expect(weightedTargets.filter((target) => target === 'b')).toHaveLength(2);

    const geo = new SysSimEngine(graph(dns({ routingPolicy: 'geolocation' })), traffic);
    expect(execute(geo, 'client', 1, 0, 'one').path.at(-1)?.nodeId)
      .toBe(execute(geo, 'client', 2, 2_000, 'two').path.at(-1)?.nodeId);
  });
});

describe('WAF tasks 112-114', () => {
  const waf = (overrides: Partial<FirewallConfig> = {}): FirewallConfig => ({ ...(createDefaultConfig('firewall', 'waf') as FirewallConfig), inspectionLatencyMs: 2, ruleCount: 200, ...overrides });

  it('applies inspection plus documented rule cost and classifies malicious rejection', () => {
    const engine = new SysSimEngine({ nodes: [{ id: 'waf', config: waf({ blockRatePercent: 100 }) }], edges: [] }, traffic);
    const blocked = execute(engine, 'waf', 1);
    expect(blocked).toMatchObject({ status: 'blocked', totalLatencyMs: 3 });
    expect(blocked.path[0]).toMatchObject({ status: 'rejected' });
    expect(engine.getMetricsSnapshot().componentMetrics.waf).toMatchObject({ wafBlockedRequests: 1, wafInfrastructureFailures: 0 });
  });

  it('reports infrastructure failure separately from WAF blocking', () => {
    const engine = new SysSimEngine({ nodes: [{ id: 'waf', config: waf({ health: 'down', blockRatePercent: 100 }) }], edges: [] }, traffic);
    expect(execute(engine, 'waf', 1).status).toBe('error');
    expect(engine.getMetricsSnapshot().componentMetrics.waf).toMatchObject({ wafBlockedRequests: 0, wafInfrastructureFailures: 1 });
  });
});

describe('reverse proxy tasks 115-118', () => {
  const proxy = (overrides: Partial<ReverseProxyConfig> = {}): ReverseProxyConfig => ({
    ...(createDefaultConfig('reverse_proxy', 'proxy') as ReverseProxyConfig), maxConnections: 1, bufferSizeKb: 10, upstreamBandwidthMbps: 1, ...overrides,
  });

  it('enforces connections and models compression, bandwidth savings, buffering, and backpressure', () => {
    const engine = new SysSimEngine({
      nodes: [{ id: 'proxy', config: proxy() }, { id: 'app', config: app('app', { processingLatencyMs: 100 }) }],
      edges: [edge('route', 'proxy', 'app')],
    }, traffic);
    const first = execute(engine, 'proxy', 1, 0, 'asset', 'read', 100);
    const second = execute(engine, 'proxy', 2, 0, 'asset2', 'read', 100);
    expect(first.status).toBe('success');
    expect(first.path[0].info).toContain('cache rules are diagram-only');
    expect(first.path[0].info).toContain('backpressure');
    expect(second.status).toBe('dropped');
    expect(engine.getMetricsSnapshot().componentMetrics.proxy).toMatchObject({
      reverseProxyRejectedConnections: 1,
      reverseProxyCompressedKbSaved: 40,
      reverseProxyBackpressureMs: 400,
    });
  });
});

describe('SQL tasks 119-120', () => {
  const sql = (): SqlDbConfig => ({ ...(createDefaultConfig('sql_db', 'db') as SqlDbConfig), readReplicasCount: 2 });

  it('uses configured client workload ratio and routes reads to replicas while writes stay primary', () => {
    const readGraph: SimGraph = {
      nodes: [{ id: 'client', config: client('client', { operationType: 'mixed', readPercentage: 100 }) }, { id: 'db', config: sql() }],
      edges: [edge('db', 'client', 'db')],
    };
    const reader = new SysSimEngine(readGraph, { ...traffic, baseQps: 2 });
    reader.start(); reader.step(1_000);
    expect(reader.getMetricsSnapshot().componentMetrics.db).toMatchObject({ sqlReads: 2, sqlWrites: 0, sqlReplicaQueries: 2, sqlPrimaryQueries: 0 });

    const writer = new SysSimEngine({ ...readGraph, nodes: [{ id: 'client', config: client('client', { operationType: 'mixed', readPercentage: 0 }) }, { id: 'db', config: sql() }] }, { ...traffic, baseQps: 1 });
    writer.start(); writer.step(1_000);
    expect(writer.getMetricsSnapshot().componentMetrics.db).toMatchObject({ sqlReads: 0, sqlWrites: 1, sqlReplicaQueries: 0, sqlPrimaryQueries: 1 });
  });

  it('round-robins eligible reads across configured virtual replicas', () => {
    const engine = new SysSimEngine({ nodes: [{ id: 'db', config: sql() }], edges: [] }, traffic);
    const first = execute(engine, 'db', 1, 0, 'one', 'read');
    const second = execute(engine, 'db', 2, 1, 'two', 'read');
    expect(first.path[0].info).toContain('read replica 1');
    expect(second.path[0].info).toContain('read replica 2');
  });
});
