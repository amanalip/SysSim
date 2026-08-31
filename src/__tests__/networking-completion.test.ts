import { describe, expect, it } from 'vitest';
import { createSimRequest } from '../engine/request';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import {
  ApiGatewayConfig,
  AppServerConfig,
  CDNConfig,
  ClientConfig,
  LoadBalancerConfig,
  SimRequest,
} from '../model/types';

const traffic = {
  pattern: 'steady' as const,
  baseQps: 0,
  burstMultiplier: 1,
  rampDurationSec: 1,
  spikeFrequencySec: 1,
  seed: 23,
};

const execute = (
  engine: SysSimEngine,
  source: string,
  id: number,
  timestamp = 0,
  key = `key-${id}`,
) => {
  const request = createSimRequest(source, timestamp, key, id);
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};

const app = (id: string, overrides: Partial<AppServerConfig> = {}): AppServerConfig => ({
  ...(createDefaultConfig('app_server', id, id) as AppServerConfig),
  processingLatencyMs: 10,
  ...overrides,
});

const loadBalancer = (overrides: Partial<LoadBalancerConfig> = {}): LoadBalancerConfig => ({
  ...(createDefaultConfig('load_balancer', 'lb', 'LB') as LoadBalancerConfig),
  ...overrides,
});

const client = (id: string): ClientConfig => createDefaultConfig('client', id, id) as ClientConfig;

describe('load balancer tasks 96-99', () => {
  it('detects failures on health-check intervals and delays recovery', () => {
    const target = app('a');
    const graph: SimGraph = {
      nodes: [
        {
          id: 'lb',
          config: loadBalancer({ healthCheckIntervalSec: 5, healthRecoveryDelaySec: 10 }),
        },
        { id: 'a', config: target },
      ],
      edges: [
        { id: 'route', source: 'lb', target: 'a', data: { protocol: 'HTTP', purpose: 'request' } },
      ],
    };
    const engine = new SysSimEngine(graph, traffic);
    expect(execute(engine, 'lb', 1, 0).path.some((hop) => hop.nodeId === 'a')).toBe(true);
    target.health = 'down';
    engine.setGraph(graph);
    expect(execute(engine, 'lb', 2, 1_000).path.some((hop) => hop.nodeId === 'a')).toBe(true);
    expect(execute(engine, 'lb', 3, 5_000).path.some((hop) => hop.nodeId === 'a')).toBe(false);
    target.health = 'healthy';
    engine.setGraph(graph);
    expect(execute(engine, 'lb', 4, 10_000).path.some((hop) => hop.nodeId === 'a')).toBe(false);
    expect(execute(engine, 'lb', 5, 20_000).path.some((hop) => hop.nodeId === 'a')).toBe(true);
  });

  it('keeps sticky clients together and applies editable target weights', () => {
    const graph: SimGraph = {
      nodes: [
        { id: 'c1', config: client('c1') },
        { id: 'c2', config: client('c2') },
        {
          id: 'lb',
          config: loadBalancer({
            stickySession: true,
            algorithm: 'weighted',
            targetWeights: { a: 3, b: 1 },
          }),
        },
        { id: 'a', config: app('a') },
        { id: 'b', config: app('b') },
      ],
      edges: [
        { id: 'c1-lb', source: 'c1', target: 'lb', data: { protocol: 'HTTP', purpose: 'request' } },
        { id: 'c2-lb', source: 'c2', target: 'lb', data: { protocol: 'HTTP', purpose: 'request' } },
        { id: 'a', source: 'lb', target: 'a', data: { protocol: 'HTTP', purpose: 'request' } },
        { id: 'b', source: 'lb', target: 'b', data: { protocol: 'HTTP', purpose: 'request' } },
      ],
    };
    const engine = new SysSimEngine(graph, traffic);
    const c1Routes = [1, 2, 3].map((id) => execute(engine, 'c1', id).path.at(-1)?.nodeId);
    expect(new Set(c1Routes).size).toBe(1);
    expect(
      engine.getMetricsSnapshot().componentMetrics.lb.loadBalancerDistributionSkewPercent,
    ).toBeGreaterThan(0);

    const weightedOnly = new SysSimEngine(
      {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === 'lb'
            ? {
                ...node,
                config: loadBalancer({
                  stickySession: false,
                  algorithm: 'weighted',
                  targetWeights: { a: 3, b: 1 },
                }),
              }
            : node,
        ),
      },
      traffic,
    );
    const routes = Array.from(
      { length: 8 },
      (_, index) => execute(weightedOnly, 'lb', index).path.at(-1)?.nodeId,
    );
    expect(routes.filter((target) => target === 'a')).toHaveLength(6);
    expect(routes.filter((target) => target === 'b')).toHaveLength(2);
  });

  it('reports unavailable-target failures separately', () => {
    const engine = new SysSimEngine(
      {
        nodes: [
          { id: 'lb', config: loadBalancer() },
          { id: 'a', config: app('a', { health: 'down' }) },
        ],
        edges: [
          { id: 'a', source: 'lb', target: 'a', data: { protocol: 'HTTP', purpose: 'request' } },
        ],
      },
      traffic,
    );
    expect(execute(engine, 'lb', 1).status).toBe('error');
    expect(engine.getMetricsSnapshot().componentMetrics.lb).toMatchObject({
      loadBalancerUnavailableFailures: 1,
      loadBalancerUnhealthyTargets: 1,
    });
  });
});

describe('API gateway tasks 100-104', () => {
  const gateway = (overrides: Partial<ApiGatewayConfig> = {}): ApiGatewayConfig => ({
    ...(createDefaultConfig('api_gateway', 'gateway', 'Gateway') as ApiGatewayConfig),
    rateLimitQps: 10,
    ...overrides,
  });

  const graph = (gatewayConfig: ApiGatewayConfig, target = app('app')): SimGraph => ({
    nodes: [
      { id: 'gateway', config: gatewayConfig },
      { id: 'app', config: target },
    ],
    edges: [
      {
        id: 'route',
        source: 'gateway',
        target: 'app',
        data: { protocol: 'HTTP', purpose: 'request' },
      },
    ],
  });

  it('enforces QPS and applies authentication-mode overhead', () => {
    const engine = new SysSimEngine(
      graph(gateway({ rateLimitQps: 1, authMode: 'OAuth2' })),
      traffic,
    );
    expect(execute(engine, 'gateway', 1).path[0]).toMatchObject({ latencyMs: 4 });
    expect(execute(engine, 'gateway', 2).status).toBe('rate_limited');
    expect(engine.getMetricsSnapshot().componentMetrics.gateway.apiGatewayThrottles).toBe(1);
  });

  it('enforces upstream timeout and reports timeout separately', () => {
    const engine = new SysSimEngine(
      graph(gateway({ timeoutMs: 5 }), app('app', { processingLatencyMs: 20 })),
      traffic,
    );
    expect(execute(engine, 'gateway', 1).status).toBe('timeout');
    expect(engine.getMetricsSnapshot().componentMetrics.gateway).toMatchObject({
      apiGatewayTimeouts: 1,
      apiGatewayThrottles: 0,
    });
  });

  it('opens after three failures, fast-fails, then admits a half-open recovery probe', () => {
    const target = app('app', { health: 'down' });
    const circuitGraph = graph(gateway(), target);
    const engine = new SysSimEngine(circuitGraph, traffic);
    [0, 1, 2].forEach((id) => expect(execute(engine, 'gateway', id, id).status).toBe('error'));
    expect(execute(engine, 'gateway', 4, 3).path[0].info).toContain('circuit is open');
    expect(engine.getMetricsSnapshot().componentMetrics.gateway).toMatchObject({
      apiGatewayCircuitState: 'open',
      apiGatewayOpenCircuitRejections: 1,
    });
    target.health = 'healthy';
    engine.setGraph(circuitGraph);
    expect(execute(engine, 'gateway', 5, 10_020).status).toBe('success');
    expect(engine.getMetricsSnapshot().componentMetrics.gateway.apiGatewayCircuitState).toBe(
      'closed',
    );
  });
});

describe('CDN task 105', () => {
  const cdn = (overrides: Partial<CDNConfig> = {}): CDNConfig => ({
    ...(createDefaultConfig('cdn', 'cdn', 'CDN') as CDNConfig),
    hitRatioPercent: 100,
    cacheTtlSec: 1,
    edgeLocationsCount: 2,
    ...overrides,
  });

  const cdnGraph = (cdnConfig: CDNConfig): SimGraph => ({
    nodes: [
      { id: 'client-a', config: client('client-a') },
      { id: 'client-b', config: client('client-b') },
      { id: 'cdn', config: cdnConfig },
      { id: 'origin', config: app('origin') },
    ],
    edges: [
      {
        id: 'a-cdn',
        source: 'client-a',
        target: 'cdn',
        data: { protocol: 'HTTP', purpose: 'request' },
      },
      {
        id: 'b-cdn',
        source: 'client-b',
        target: 'cdn',
        data: { protocol: 'HTTP', purpose: 'request' },
      },
      {
        id: 'origin',
        source: 'cdn',
        target: 'origin',
        data: { protocol: 'HTTP', purpose: 'request' },
      },
    ],
  });

  it('uses hit target, TTL, edge locations, and optional origin shielding', () => {
    const shielded = new SysSimEngine(cdnGraph(cdn({ originShielding: true })), traffic);
    expect(
      execute(shielded, 'client-a', 1, 0, 'asset').path.some((hop) => hop.nodeId === 'origin'),
    ).toBe(true);
    expect(
      execute(shielded, 'client-b', 2, 0, 'asset').path.find((hop) => hop.nodeId === 'cdn')?.info,
    ).toContain('coalesced');

    const unshielded = new SysSimEngine(cdnGraph(cdn({ originShielding: false })), traffic);
    execute(unshielded, 'client-a', 1, 0, 'asset');
    expect(
      execute(unshielded, 'client-b', 2, 0, 'asset').path.some((hop) => hop.nodeId === 'origin'),
    ).toBe(true);
    unshielded.start();
    unshielded.step(20);
    expect(
      execute(unshielded, 'client-a', 3, 20, 'asset').path.find((hop) => hop.nodeId === 'cdn')
        ?.status,
    ).toBe('hit');
    unshielded.step(1_100);
    expect(
      execute(unshielded, 'client-a', 4, 1_120, 'asset').path.find((hop) => hop.nodeId === 'cdn')
        ?.status,
    ).toBe('miss');
  });
});
