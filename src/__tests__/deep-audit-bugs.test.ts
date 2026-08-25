import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiterModel } from '../engine/components/rate-limiter-model';
import { QueueModel } from '../engine/components/queue-model';
import { DatabaseModel } from '../engine/components/db-model';
import { LoadBalancerRouter } from '../engine/routing/load-balancer';
import { computeAutoLayout } from '../layout/auto-layout';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { SysSimEngine } from '../engine/simulator';
import { useStore, CanvasNode, CanvasEdge } from '../store/use-store';
import { createDefaultConfig } from '../model/component-defaults';

describe('Deep Audit Bug Fixes & Feature Tests (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. verifies RateLimiterModel refills tokens accurately when elapsed time starts at 0', () => {
    const rl = new RateLimiterModel('token_bucket', 100, 1);
    // At simulation start time 0, initial tokens should allow first request
    expect(rl.allowRequest(0)).toBe(true);

    // Drain all tokens
    for (let i = 0; i < 99; i++) {
      rl.allowRequest(0);
    }
    // Next request at time 0 should be rejected
    expect(rl.allowRequest(0)).toBe(false);

    // Advance simulated time by 500ms (refills 50 tokens)
    expect(rl.allowRequest(500)).toBe(true);
  });

  it('2. verifies RateLimiterModel reset restores full token bucket capacity', () => {
    const rl = new RateLimiterModel('token_bucket', 50, 1);
    for (let i = 0; i < 50; i++) {
      rl.allowRequest(0);
    }
    expect(rl.allowRequest(0)).toBe(false);

    rl.reset();
    expect(rl.allowRequest(0)).toBe(true);
  });

  it('3. verifies computeAutoLayout handles cyclic graphs safely without infinite loops', () => {
    const nodeA: CanvasNode = {
      id: 'node_a',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config: createDefaultConfig('app_server', 'node_a', 'Server A') },
    };
    const nodeB: CanvasNode = {
      id: 'node_b',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config: createDefaultConfig('app_server', 'node_b', 'Server B') },
    };

    // Cyclic edges: A -> B and B -> A
    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'node_a', target: 'node_b', data: { protocol: 'HTTP' } },
      { id: 'e2', source: 'node_b', target: 'node_a', data: { protocol: 'HTTP' } },
    ];

    const layouted = computeAutoLayout([nodeA, nodeB], edges);
    expect(layouted.length).toBe(2);
    expect(layouted[0].position.x).toBeDefined();
    expect(layouted[1].position.x).toBeDefined();
  });

  it('4. verifies BottleneckDetector recognizes browser_cache as a valid caching layer', () => {
    const dbNode: CanvasNode = {
      id: 'db_1',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config: createDefaultConfig('sql_db', 'db_1', 'Postgres') },
    };
    const cacheNode: CanvasNode = {
      id: 'cache_1',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config: createDefaultConfig('browser_cache', 'cache_1', 'Browser Cache') },
    };

    const issues = detectBottlenecks([dbNode, cacheNode], []);
    const hasMissingCache = issues.some((i) => i.type === 'missing_cache');
    expect(hasMissingCache).toBe(false);
  });

  it('5. verifies BottleneckDetector recognizes pubsub and event_bus as async queue layers', () => {
    const nodes: CanvasNode[] = [
      { id: 'c1', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: createDefaultConfig('client', 'c1', 'Client') } },
      { id: 'gw', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'Gateway') } },
      { id: 's1', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: createDefaultConfig('app_server', 's1', 'Server') } },
      { id: 'ps', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: createDefaultConfig('pubsub', 'ps', 'PubSub Broker') } },
      { id: 'w1', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: createDefaultConfig('worker', 'w1', 'Worker') } },
    ];

    const edges: CanvasEdge[] = [
      { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
      { id: 'e2', source: 'gw', target: 's1', data: { protocol: 'HTTP' } },
      { id: 'e3', source: 's1', target: 'ps', data: { protocol: 'pub/sub' } },
      { id: 'e4', source: 'ps', target: 'w1', data: { protocol: 'pub/sub' } },
    ];

    const issues = detectBottlenecks(nodes, edges);
    const hasSyncChain = issues.some((i) => i.type === 'synchronous_chain');
    expect(hasSyncChain).toBe(false);
  });

  it('6. verifies LoadBalancerRouter distributes traffic evenly for weighted algorithm when weights are unspecified', () => {
    const lb = new LoadBalancerRouter('weighted', ['server_1', 'server_2']);
    const hits: Record<string, number> = { server_1: 0, server_2: 0 };

    for (let i = 0; i < 20; i++) {
      const selected = lb.selectTarget(`req_${i}`);
      if (selected) hits[selected]++;
    }

    expect(hits['server_1']).toBe(10);
    expect(hits['server_2']).toBe(10);
  });

  it('7. verifies QueueModel reset clears queue depth completely', () => {
    const q = new QueueModel(1000, 500, 4);
    q.enqueue();
    q.enqueue();
    q.enqueue();
    expect(q.getDepth()).toBe(3);

    q.reset();
    expect(q.getDepth()).toBe(0);
  });

  it('8. verifies DatabaseModel reset clears connection pools', () => {
    const db = new DatabaseModel(20, 100, 2);
    db.executeQuery();
    db.executeQuery();
    expect(db.getActiveConnections()).toBeGreaterThan(0);

    db.reset();
    expect(db.getActiveConnections()).toBe(0);
  });

  it('9. verifies SysSimEngine.reset resets internal models (queues, databases, rate limiters)', () => {
    const clientNode = { id: 'c1', config: createDefaultConfig('client', 'c1', 'Client') };
    const qNode = { id: 'q1', config: createDefaultConfig('message_queue', 'q1', 'Kafka') };

    const engine = new SysSimEngine({
      nodes: [clientNode, qNode],
      edges: [{ id: 'e1', source: 'c1', target: 'q1', data: { protocol: 'pub/sub' } }],
    });

    engine.start();
    engine.step(100);

    const snapBefore = engine.getMetricsSnapshot();
    expect(snapBefore.totalRequestsSent).toBeGreaterThan(0);

    engine.reset();
    const snapAfter = engine.getMetricsSnapshot();
    expect(snapAfter.totalRequestsSent).toBe(0);
    expect(snapAfter.componentMetrics['q1'].queueDepth).toBe(0);
  });

  it('10. verifies Zone label editing updates the canvas store correctly', () => {
    useStore.getState().addZone('Public Subnet', 'public', { x: 0, y: 0, width: 200, height: 200 });
    const zoneId = useStore.getState().zones[0].id;
    expect(useStore.getState().zones[0].label).toBe('Public Subnet');

    useStore.getState().updateZone(zoneId, { label: 'DMZ Security Zone' });
    expect(useStore.getState().zones[0].label).toBe('DMZ Security Zone');
  });

  it('11. verifies duplicateNode assigns an offset position and appends (Copy) suffix', () => {
    const nodeId = useStore.getState().addNode('redis_cache', { x: 150, y: 200 }, 'Session Cache');
    const copyId = useStore.getState().duplicateNode(nodeId);

    expect(copyId).toBeTruthy();
    const nodes = useStore.getState().nodes;
    const copyNode = nodes.find((n) => n.id === copyId);
    expect(copyNode?.data.config.name).toBe('Session Cache (Copy)');
    expect(copyNode?.position.x).toBe(190);
    expect(copyNode?.position.y).toBe(240);
  });
});
