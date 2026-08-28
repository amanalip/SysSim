import { describe, expect, it } from 'vitest';
import { SysSimEngine, SimEdge, SimGraph, SimNode } from '../engine/simulator';
import { createSimRequest } from '../engine/request';
import { inferEdgePurpose } from '../model/edge-semantics';
import { createDefaultConfig } from '../model/component-defaults';
import { AppServerConfig, RedisCacheConfig, SimRequest } from '../model/types';
import { useStore } from '../store/use-store';

const appNode = (
  id: string,
  latencyMs: number,
  health: 'healthy' | 'down' = 'healthy',
): SimNode => ({
  id,
  config: {
    ...(createDefaultConfig('app_server', id, id) as AppServerConfig),
    replicas: 1,
    processingLatencyMs: latencyMs,
    health,
  },
});

const edge = (
  id: string,
  source: string,
  target: string,
  purpose: SimEdge['data']['purpose'],
): SimEdge => ({
  id,
  source,
  target,
  data: { protocol: 'HTTP', purpose, latencyMs: 0 },
});

const execute = (graph: SimGraph, sourceNodeId: string, requestId = 'req_test') => {
  const engine = new SysSimEngine(graph);
  const request = createSimRequest(sourceNodeId, 0);
  request.id = requestId;
  (engine as unknown as { processRequest: (req: SimRequest) => void }).processRequest(request);
  return { engine, request };
};

describe('Explicit edge-purpose semantics', () => {
  it('infers only an initial purpose while keeping all six purposes representable', () => {
    expect(inferEdgePurpose('app_server', 'sql_db', 'HTTP')).toBe('request');
    expect(inferEdgePurpose('app_server', 'message_queue', 'HTTP')).toBe('async');
    expect(inferEdgePurpose('sql_db', 'sql_db', 'TCP')).toBe('replication');
    expect(inferEdgePurpose('event_bus', 'worker', 'pub/sub')).toBe('fanout');

    const purposes: SimEdge['data']['purpose'][] = [
      'request',
      'fallback',
      'async',
      'fanout',
      'replication',
      'observability',
    ];
    expect(new Set(purposes).size).toBe(6);
  });

  it('stores the inferred purpose and treats an explicit update as authoritative', () => {
    useStore.setState({ nodes: [], edges: [], historyPast: [], historyFuture: [] });
    const source = useStore.getState().addNode('app_server', { x: 0, y: 0 });
    const queue = useStore.getState().addNode('message_queue', { x: 200, y: 0 });

    expect(useStore.getState().addEdge(source, queue, 'HTTP')).toBe(true);
    const edgeId = useStore.getState().edges[0].id;
    expect(useStore.getState().edges[0].data.purpose).toBe('async');

    useStore.getState().updateEdgePurpose(edgeId, 'request');
    useStore.getState().updateEdgeProtocol(edgeId, 'MQTT');
    expect(useStore.getState().edges[0].data.purpose).toBe('request');
  });

  it('waits for every synchronous request dependency on a generic node', () => {
    const graph: SimGraph = {
      nodes: [appNode('source', 10), appNode('a', 20), appNode('b', 30)],
      edges: [edge('to-a', 'source', 'a', 'request'), edge('to-b', 'source', 'b', 'request')],
    };

    const { engine, request } = execute(graph, 'source');
    const metrics = engine.getMetricsSnapshot().componentMetrics;

    expect(request.status).toBe('success');
    expect(request.path.map((hop) => hop.nodeId)).toEqual(['source', 'a', 'b']);
    expect(request.totalLatencyMs).toBe(60);
    expect(metrics.a.totalRequests).toBe(1);
    expect(metrics.b.totalRequests).toBe(1);
  });

  it('keeps load-balancer target selection separate from generic branching', () => {
    const lb: SimNode = {
      id: 'lb',
      config: createDefaultConfig('load_balancer', 'lb', 'Load Balancer'),
    };
    const graph: SimGraph = {
      nodes: [lb, appNode('a', 20), appNode('b', 20)],
      edges: [edge('to-a', 'lb', 'a', 'request'), edge('to-b', 'lb', 'b', 'request')],
    };
    const engine = new SysSimEngine(graph);
    const first = createSimRequest('lb', 0);
    first.id = 'req_1';
    const second = createSimRequest('lb', 0);
    second.id = 'req_2';

    (engine as unknown as { processRequest: (req: SimRequest) => void }).processRequest(first);
    (engine as unknown as { processRequest: (req: SimRequest) => void }).processRequest(second);

    expect(first.path.filter((hop) => hop.nodeType === 'app_server')).toHaveLength(1);
    expect(second.path.filter((hop) => hop.nodeType === 'app_server')).toHaveLength(1);
    expect(engine.getMetricsSnapshot().componentMetrics.a.totalRequests).toBe(1);
    expect(engine.getMetricsSnapshot().componentMetrics.b.totalRequests).toBe(1);
  });

  it('runs fanout branches independently and waits for the slowest branch', () => {
    const nodes = [appNode('source', 10), appNode('a', 20), appNode('b', 40)];
    const fanout = execute(
      {
        nodes,
        edges: [edge('to-a', 'source', 'a', 'fanout'), edge('to-b', 'source', 'b', 'fanout')],
      },
      'source',
    ).request;
    const sequential = execute(
      {
        nodes,
        edges: [edge('to-a', 'source', 'a', 'request'), edge('to-b', 'source', 'b', 'request')],
      },
      'source',
    ).request;

    expect(fanout.path.map((hop) => hop.nodeId)).toEqual(['source', 'a', 'b']);
    expect(fanout.path.filter((hop) => hop.viaEdgePurpose === 'fanout')).toHaveLength(2);
    expect(fanout.totalLatencyMs).toBe(50);
    expect(sequential.totalLatencyMs).toBe(70);
  });

  it('uses fallback only after a primary failure or cache miss', () => {
    const failureGraph: SimGraph = {
      nodes: [appNode('source', 10), appNode('primary', 20, 'down'), appNode('backup', 30)],
      edges: [
        edge('primary', 'source', 'primary', 'request'),
        edge('backup', 'source', 'backup', 'fallback'),
      ],
    };
    const failedPrimary = execute(failureGraph, 'source');

    expect(failedPrimary.request.status).toBe('success');
    expect(failedPrimary.request.path.map((hop) => hop.nodeId)).toEqual([
      'source',
      'primary',
      'backup',
    ]);
    expect(failedPrimary.request.path.at(-1)?.viaEdgePurpose).toBe('fallback');

    const healthyGraph: SimGraph = {
      ...failureGraph,
      nodes: [appNode('source', 10), appNode('primary', 20), appNode('backup', 30)],
    };
    const healthyPrimary = execute(healthyGraph, 'source');
    expect(healthyPrimary.request.path.map((hop) => hop.nodeId)).toEqual(['source', 'primary']);
    expect(healthyPrimary.engine.getMetricsSnapshot().componentMetrics.backup.totalRequests).toBe(0);

    const cache: SimNode = {
      id: 'cache',
      config: {
        ...(createDefaultConfig('redis_cache', 'cache', 'Cache') as RedisCacheConfig),
        hitRatioPercent: 0,
      },
    };
    const cacheMiss = execute(
      {
        nodes: [cache, appNode('origin', 25)],
        edges: [edge('origin-fallback', 'cache', 'origin', 'fallback')],
      },
      'cache',
    ).request;
    expect(cacheMiss.path.map((hop) => hop.status)).toEqual(['miss', 'processed']);
    expect(cacheMiss.path.at(-1)?.viaEdgePurpose).toBe('fallback');
  });

  it('stops async latency at acknowledgement while processing downstream independently', () => {
    const queue: SimNode = {
      id: 'queue',
      config: createDefaultConfig('message_queue', 'queue', 'Queue'),
    };
    const graph: SimGraph = {
      nodes: [appNode('source', 10), queue, appNode('worker', 100, 'down')],
      edges: [
        { ...edge('enqueue', 'source', 'queue', 'async'), data: { protocol: 'HTTP', purpose: 'async', latencyMs: 2 } },
        edge('consume', 'queue', 'worker', 'request'),
      ],
    };
    const { engine, request } = execute(graph, 'source');

    expect(request.status).toBe('success');
    expect(request.path.map((hop) => hop.nodeId)).toEqual(['source', 'queue']);
    expect(request.totalLatencyMs).toBe(16);
    expect(request.color).toBe('#a855f7');
    expect(engine.getMetricsSnapshot().componentMetrics.worker.failedRequests).toBe(0);
    engine.start();
    engine.step(100);
    expect(engine.getMetricsSnapshot().componentMetrics.queue.queueDepth).toBeGreaterThan(0);

    const unavailableQueue: SimNode = {
      ...queue,
      config: { ...queue.config, health: 'down' },
    };
    const failedAcknowledgement = execute(
      {
        nodes: [appNode('source', 10), unavailableQueue],
        edges: [edge('enqueue', 'source', 'queue', 'async')],
      },
      'source',
    ).request;
    expect(failedAcknowledgement.status).toBe('error');
  });

  it('processes replication without adding it to end-user latency or status', () => {
    const { engine, request } = execute(
      {
        nodes: [appNode('primary', 10), appNode('replica', 50, 'down')],
        edges: [edge('replicate', 'primary', 'replica', 'replication')],
      },
      'primary',
    );

    expect(request.status).toBe('success');
    expect(request.totalLatencyMs).toBe(10);
    expect(request.path.map((hop) => hop.nodeId)).toEqual(['primary']);
    expect(engine.getMetricsSnapshot().componentMetrics.replica.failedRequests).toBe(1);
  });
});
