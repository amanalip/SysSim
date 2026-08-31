import { beforeEach, describe, expect, it } from 'vitest';
import { chaosDrills } from '../engine/chaos-drills';
import { createDefaultConfig } from '../model/component-defaults';
import { CanvasEdge, CanvasNode, useStore } from '../store/use-store';

const node = (
  type: Parameters<typeof createDefaultConfig>[0],
  id: string,
  overrides = {},
): CanvasNode => ({
  id,
  type: 'customComponent',
  position: { x: 0, y: 0 },
  data: {
    config: { ...createDefaultConfig(type, id), ...overrides } as ReturnType<
      typeof createDefaultConfig
    >,
  },
});
const edge = (id: string, source: string, target: string, latencyMs = 10): CanvasEdge => ({
  id,
  source,
  target,
  type: 'protocolEdge',
  data: { protocol: 'HTTP', purpose: 'request', latencyMs },
});

describe('chaos drill tasks 158 and 160-171', () => {
  beforeEach(() => {
    chaosDrills.restoreAll();
    chaosDrills.resetForTests();
    useStore.setState({
      nodes: [],
      edges: [],
      trafficConfig: {
        pattern: 'bursty',
        baseQps: 120,
        burstMultiplier: 3,
        rampDurationSec: 30,
        spikeFrequencySec: 10,
        seed: 8,
      },
      nodeHealthOverrides: {},
      nodeHealthSources: {},
    });
  });

  it('exercises SQL internal failover and restores the pre-existing health state', () => {
    useStore.setState({
      nodes: [
        node('sql_db', 'db', {
          automaticFailover: true,
          readReplicasCount: 1,
          health: 'overloaded',
        }),
      ],
    });
    const record = chaosDrills.launch('db_outage');
    expect(record).toMatchObject({
      succeeded: true,
      affectedTargets: ['db'],
      injectedParameters: { failureMode: 'internal_replica_failover' },
    });
    expect(useStore.getState().nodeHealthSources.db).toBe('chaos');
    expect(chaosDrills.restore('db_outage')).toBe(true);
    expect(useStore.getState().nodes[0].data.config.health).toBe('overloaded');
  });

  it('reports a failover failure without a replica or topology target', () => {
    useStore.setState({
      nodes: [
        node('sql_db', 'db', { automaticFailover: false, readReplicasCount: 0, replicas: 1 }),
      ],
    });
    expect(chaosDrills.launch('db_outage')).toMatchObject({
      succeeded: false,
      affectedTargets: [],
    });
  });

  it('bypasses caches, optionally enables coalescing, and restores exact config', () => {
    useStore.setState({
      nodes: [
        node('redis_cache', 'cache', { hitRatioPercent: 88, requestCoalescingEnabled: false }),
      ],
    });
    expect(
      chaosDrills.launch('cache_stampede', { stampedeProtection: true }).injectedParameters,
    ).toMatchObject({ cacheHitRatioPercent: 0, stampedeProtection: true });
    expect(useStore.getState().nodes[0].data.config).toMatchObject({
      hitRatioPercent: 0,
      requestCoalescingEnabled: true,
    });
    chaosDrills.restore('cache_stampede');
    expect(useStore.getState().nodes[0].data.config).toMatchObject({
      hitRatioPercent: 88,
      requestCoalescingEnabled: false,
    });
  });

  it('multiplies QPS once, preserves pattern, blocks overlap, and restores traffic', () => {
    const record = chaosDrills.launch('flash_crowd');
    expect(record.injectedParameters).toMatchObject({
      multiplier: 5,
      originalQps: 120,
      injectedQps: 600,
      preservedPattern: 'bursty',
    });
    expect(useStore.getState().trafficConfig).toMatchObject({ baseQps: 600, pattern: 'bursty' });
    expect(chaosDrills.launch('flash_crowd').succeeded).toBe(false);
    chaosDrills.restore('flash_crowd');
    expect(useStore.getState().trafficConfig).toMatchObject({ baseQps: 120, pattern: 'bursty' });
  });

  it('selects a semantic ingress edge and restores its prior cut state', () => {
    useStore.setState({
      nodes: [
        node('app_server', 'app'),
        node('sql_db', 'db'),
        node('client', 'client'),
        node('api_gateway', 'gateway'),
      ],
      edges: [edge('internal', 'app', 'db'), edge('ingress', 'client', 'gateway')],
    });
    expect(chaosDrills.launch('ingress_partition').affectedTargets).toEqual(['ingress']);
    expect(useStore.getState().edges.find((item) => item.id === 'ingress')?.data.isCut).toBe(true);
    chaosDrills.restore('ingress_partition');
    expect(
      useStore.getState().edges.find((item) => item.id === 'ingress')?.data.isCut,
    ).toBeUndefined();
  });

  it('adds exactly 400ms and records/restores every injected value', () => {
    useStore.setState({
      nodes: [node('client', 'client'), node('api_gateway', 'gateway')],
      edges: [edge('ingress', 'client', 'gateway', 17)],
    });
    const record = chaosDrills.launch('network_latency');
    expect(record.startedAt).toEqual(expect.any(Number));
    expect(record).toMatchObject({
      affectedTargets: ['ingress'],
      injectedParameters: { addedLatencyMs: 400 },
      succeeded: true,
    });
    expect(useStore.getState().edges[0].data.latencyMs).toBe(417);
    chaosDrills.restore('network_latency');
    expect(useStore.getState().edges[0].data.latencyMs).toBe(17);
  });
});
