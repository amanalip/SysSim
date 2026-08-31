import { describe, expect, it } from 'vitest';
import { createSimRequest } from '../engine/request';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import { AppServerConfig, LoadBalancerConfig, ServerlessConfig, SimRequest } from '../model/types';

const traffic = {
  pattern: 'steady' as const,
  baseQps: 0,
  burstMultiplier: 1,
  rampDurationSec: 1,
  spikeFrequencySec: 1,
  seed: 17,
};

const execute = (engine: SysSimEngine, source: string, id: number, key = `key-${id}`) => {
  const request = createSimRequest(source, 0, key, id);
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};

const serverless = (overrides: Partial<ServerlessConfig> = {}): ServerlessConfig => ({
  ...(createDefaultConfig('serverless', 'function', 'Function') as ServerlessConfig),
  concurrencyLimit: 1,
  warmInstances: 1,
  baseExecutionLatencyMs: 100,
  ...overrides,
});

const app = (id: string, overrides: Partial<AppServerConfig> = {}): AppServerConfig => ({
  ...(createDefaultConfig('app_server', id, id) as AppServerConfig),
  replicas: 1,
  maxConnections: 1,
  processingLatencyMs: 100,
  ...overrides,
});

const loadBalancer = (algorithm: LoadBalancerConfig['algorithm']): LoadBalancerConfig => ({
  ...(createDefaultConfig('load_balancer', 'lb', 'LB') as LoadBalancerConfig),
  algorithm,
});

describe('serverless completion', () => {
  it('throttles excess invocations and reports them separately', () => {
    const engine = new SysSimEngine(
      { nodes: [{ id: 'function', config: serverless() }], edges: [] },
      traffic,
    );
    const first = execute(engine, 'function', 1);
    const second = execute(engine, 'function', 2);
    expect(first.status).toBe('success');
    expect(second.status).toBe('rate_limited');
    expect(second.path[0].info).toContain('concurrency limit exhausted');
    expect(engine.getMetricsSnapshot().componentMetrics.function).toMatchObject({
      serverlessThrottles: 1,
      serverlessInvocationFailures: 0,
      serverlessDownstreamFailures: 0,
    });
  });

  it('distinguishes platform invocation failure from downstream failure', () => {
    const invocationFailure = new SysSimEngine(
      {
        nodes: [{ id: 'function', config: serverless({ failureRatePercent: 100 }) }],
        edges: [],
      },
      traffic,
    );
    execute(invocationFailure, 'function', 1);
    expect(invocationFailure.getMetricsSnapshot().componentMetrics.function).toMatchObject({
      serverlessInvocationFailures: 1,
      serverlessDownstreamFailures: 0,
    });

    const downstreamFailure = new SysSimEngine(
      {
        nodes: [
          { id: 'function', config: serverless() },
          { id: 'downstream', config: app('downstream', { health: 'down' }) },
        ],
        edges: [
          {
            id: 'call',
            source: 'function',
            target: 'downstream',
            data: { protocol: 'HTTP', purpose: 'request' },
          },
        ],
      },
      traffic,
    );
    execute(downstreamFailure, 'function', 1);
    expect(downstreamFailure.getMetricsSnapshot().componentMetrics.function).toMatchObject({
      serverlessInvocationFailures: 0,
      serverlessDownstreamFailures: 1,
    });
  });
});

describe('load-balancer completion', () => {
  it('tracks connection lifetimes so least-connections balances overlapping work', () => {
    const graph: SimGraph = {
      nodes: [
        { id: 'lb', config: loadBalancer('least_connections') },
        { id: 'a', config: app('a') },
        { id: 'b', config: app('b') },
      ],
      edges: [
        { id: 'a', source: 'lb', target: 'a', data: { protocol: 'HTTP', purpose: 'request' } },
        { id: 'b', source: 'lb', target: 'b', data: { protocol: 'HTTP', purpose: 'request' } },
      ],
    };
    const engine = new SysSimEngine(graph, traffic);
    const routes = [execute(engine, 'lb', 1), execute(engine, 'lb', 2)].map(
      (request) => request.path[1].nodeId,
    );
    expect(routes).toEqual(['a', 'b']);
    expect(engine.getMetricsSnapshot().componentMetrics.lb.activeConnections).toBe(2);
    engine.start();
    engine.step(1000);
    expect(engine.getMetricsSnapshot().componentMetrics.lb.activeConnections).toBe(0);
  });

  it('excludes down targets and keys hashing by request or originating client as appropriate', () => {
    const makeEngine = (algorithm: LoadBalancerConfig['algorithm'], downA = false) =>
      new SysSimEngine(
        {
          nodes: [
            { id: 'lb', config: loadBalancer(algorithm) },
            { id: 'a', config: app('a', { health: downA ? 'down' : 'healthy' }) },
            { id: 'b', config: app('b') },
          ],
          edges: [
            { id: 'a', source: 'lb', target: 'a', data: { protocol: 'HTTP', purpose: 'request' } },
            { id: 'b', source: 'lb', target: 'b', data: { protocol: 'HTTP', purpose: 'request' } },
          ],
        },
        traffic,
      );

    const healthy = makeEngine('round_robin', true);
    expect(execute(healthy, 'lb', 1).path[1].nodeId).toBe('b');
    expect(execute(healthy, 'lb', 2).path[1].nodeId).toBe('b');

    const consistent = makeEngine('consistent_hashing');
    expect(execute(consistent, 'lb', 1, 'account:9').path[1].nodeId).toBe(
      execute(consistent, 'lb', 2, 'account:9').path[1].nodeId,
    );

    const ipHash = makeEngine('ip_hash');
    expect(execute(ipHash, 'lb', 1, 'first').path[1].nodeId).toBe(
      execute(ipHash, 'lb', 2, 'second').path[1].nodeId,
    );
  });
});
