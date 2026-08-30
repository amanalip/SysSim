import { describe, expect, it } from 'vitest';
import { scoreArchitectureHealth } from '../analysis/health-scoring';
import { createDefaultConfig } from '../model/component-defaults';
import { OverallMetrics } from '../model/types';
import { useStore } from '../store/use-store';

const node = (id: string, type: Parameters<typeof createDefaultConfig>[0], patch: Record<string, unknown> = {}) => ({ id, data: { config: { ...createDefaultConfig(type, id, id), ...patch } as ReturnType<typeof createDefaultConfig> } });
const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target, data: { protocol: 'HTTP' as const, purpose: 'request' as const } });
const metrics = (samples: number, errorRate = 0, p95 = 0): OverallMetrics => ({
  ...useStore.getState().metrics, totalRequestsCompleted: samples, totalRequestsSuccess: Math.round(samples * (1 - errorRate / 100)),
  totalRequestsFailed: Math.round(samples * errorRate / 100), overallErrorRatePercent: errorRate, p95LatencyMs: p95,
});
const traffic = { pattern: 'steady' as const, baseQps: 1_000, burstMultiplier: 2, rampDurationSec: 30, spikeFrequencySec: 30 };

describe('evidence-based health scoring tasks 276-284', () => {
  it('does not report perfect availability or latency before evidence exists', () => {
    const pillars = scoreArchitectureHealth({ nodes: [node('client', 'client'), node('app', 'app_server')], edges: [edge('client', 'app')], metrics: metrics(0), bottlenecks: [], trafficConfig: traffic });
    expect(pillars.find((pillar) => pillar.name === 'Availability')).toMatchObject({ score: null, confidence: 'no evidence', evidenceKind: 'runtime telemetry' });
    expect(pillars.find((pillar) => pillar.name === 'Modeled Latency')?.score).toBeNull();
  });

  it('reports sample-size confidence and runtime score ranges', () => {
    const low = scoreArchitectureHealth({ nodes: [node('client', 'client')], edges: [], metrics: metrics(20, 5, 250), bottlenecks: [], trafficConfig: traffic });
    expect(low.find((pillar) => pillar.name === 'Availability')).toMatchObject({ confidence: 'low', sampleSize: 20, score: 90 });
    expect(low.find((pillar) => pillar.name === 'Modeled Latency')?.score).toBe(50);
    const high = scoreArchitectureHealth({ nodes: [node('client', 'client')], edges: [], metrics: metrics(2_000, 1, 40), bottlenecks: [], trafficConfig: traffic });
    expect(high.find((pillar) => pillar.name === 'Availability')?.confidence).toBe('high');
    expect(high.find((pillar) => pillar.name === 'Modeled Latency')?.score).toBeGreaterThanOrEqual(90);
  });

  it('scores reachable redundant paths and configured failover above a fragile chain', () => {
    const fragileNodes = [node('client', 'client'), node('app', 'app_server', { replicas: 1 }), node('db', 'sql_db', { readReplicasCount: 0, automaticFailover: false })];
    const fragile = scoreArchitectureHealth({ nodes: fragileNodes, edges: [edge('client', 'app'), edge('app', 'db')], metrics: metrics(0),
      bottlenecks: [{ id: 'spof', type: 'spof', severity: 'warning', nodeId: 'app', nodeName: 'app', title: 'spof', description: '', suggestedFix: '' }], trafficConfig: traffic });
    const robustNodes = [node('client', 'client'), node('lb', 'load_balancer'), node('a', 'app_server', { replicas: 2 }), node('b', 'app_server', { replicas: 2 }), node('db', 'sql_db', { readReplicasCount: 2, automaticFailover: true })];
    const robust = scoreArchitectureHealth({ nodes: robustNodes, edges: [edge('client', 'lb'), edge('lb', 'a'), edge('lb', 'b'), edge('a', 'db'), edge('b', 'db')], metrics: metrics(0), bottlenecks: [], trafficConfig: traffic });
    const fragileScore = fragile.find((pillar) => pillar.name === 'Resilience')?.score || 0;
    const robustScore = robust.find((pillar) => pillar.name === 'Resilience')?.score || 0;
    expect(fragileScore).toBeLessThanOrEqual(40);
    expect(robustScore).toBeGreaterThanOrEqual(80);
  });

  it('uses estimated monthly cost relative to workload for cost efficiency', () => {
    const nodes = [node('client', 'client'), node('app', 'app_server', { replicas: 8 })];
    const lowWorkload = scoreArchitectureHealth({ nodes, edges: [edge('client', 'app')], metrics: metrics(0), bottlenecks: [], trafficConfig: { ...traffic, baseQps: 1 } });
    const highWorkload = scoreArchitectureHealth({ nodes, edges: [edge('client', 'app')], metrics: metrics(0), bottlenecks: [], trafficConfig: { ...traffic, baseQps: 10_000 } });
    expect(highWorkload.find((pillar) => pillar.name === 'Cost Efficiency')?.score).toBeGreaterThan(lowWorkload.find((pillar) => pillar.name === 'Cost Efficiency')?.score || 0);
  });

  it('aligns recommendations with detected graph evidence', () => {
    const pillars = scoreArchitectureHealth({ nodes: [node('client', 'client'), node('app', 'app_server')], edges: [edge('client', 'app')], metrics: metrics(0), bottlenecks: [], trafficConfig: traffic });
    expect(pillars.find((pillar) => pillar.name === 'Scalability')?.summary).toContain('load balancer no');
    expect(pillars.find((pillar) => pillar.name === 'Resilience')?.suggestions.join(' ')).toMatch(/second reachable route/i);
  });
});
