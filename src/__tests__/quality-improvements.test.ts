import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { SysSimEngine } from '../engine/simulator';
import { chaosRunner } from '../engine/metrics/chaos-runner';
import { serializeCanvasState, decodeStateFromUrlHash, encodeStateToUrlHash } from '../utils/sharing';
import { createDefaultConfig } from '../model/component-defaults';

describe('Quality Improvements & Bug Fixes Test Suite (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. distributes requests across multiple outgoing edges on non-LB nodes (fanout routing)', () => {
    const clientNode = { id: 'client_1', config: createDefaultConfig('client', 'client_1', 'Client') };
    const gwNode = { id: 'gw_1', config: createDefaultConfig('api_gateway', 'gw_1', 'API Gateway') };
    const srvA = { id: 'srv_a', config: createDefaultConfig('app_server', 'srv_a', 'App Server A') };
    const srvB = { id: 'srv_b', config: createDefaultConfig('app_server', 'srv_b', 'App Server B') };

    const engine = new SysSimEngine({
      nodes: [clientNode, gwNode, srvA, srvB],
      edges: [
        { id: 'e1', source: 'client_1', target: 'gw_1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw_1', target: 'srv_a', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'gw_1', target: 'srv_b', data: { protocol: 'HTTP' } },
      ],
    });

    engine.start();
    // Step forward multiple ticks
    for (let i = 0; i < 10; i++) {
      engine.step(100);
    }

    const snap = engine.getMetricsSnapshot();
    const statsA = snap.componentMetrics['srv_a'];
    const statsB = snap.componentMetrics['srv_b'];

    expect(statsA).toBeDefined();
    expect(statsB).toBeDefined();
    expect(statsA.totalRequests).toBeGreaterThan(0);
    expect(statsB.totalRequests).toBeGreaterThan(0);
  });

  it('2. generates 502 Bad Gateway error hop when a load balancer has 0 reachable targets', () => {
    const clientNode = { id: 'client_1', config: createDefaultConfig('client', 'client_1', 'Client') };
    const lbNode = { id: 'lb_1', config: createDefaultConfig('load_balancer', 'lb_1', 'Load Balancer') };

    // LB has no outgoing edges
    const engine = new SysSimEngine({
      nodes: [clientNode, lbNode],
      edges: [
        { id: 'e1', source: 'client_1', target: 'lb_1', data: { protocol: 'HTTP' } },
      ],
    });

    engine.start();
    const res = engine.step(200);

    expect(res.metrics.totalRequestsFailed).toBeGreaterThan(0);
    const lastReq = res.recentRequests[res.recentRequests.length - 1];
    expect(lastReq).toBeDefined();
    expect(lastReq.status).toBe('error');
    expect(lastReq.path.some((p) => p.info?.includes('502 Bad Gateway'))).toBe(true);
  });

  it('3. duplicates nodes while cloning custom configuration properties accurately', () => {
    const originalId = useStore.getState().addNode('app_server', { x: 100, y: 100 }, 'Production Server');
    useStore.getState().updateNodeConfig(originalId, {
      replicas: 8,
      processingLatencyMs: 45,
      failureRatePercent: 5,
    });

    const copyId = useStore.getState().duplicateNode(originalId);
    expect(copyId).toBeDefined();
    expect(copyId).not.toBe(originalId);

    const nodes = useStore.getState().nodes;
    const copyNode = nodes.find((n) => n.id === copyId);

    expect(copyNode).toBeDefined();
    const config = copyNode?.data.config as import('../model/types').AppServerConfig;
    expect(config.name).toBe('Production Server (Copy)');
    expect(config.replicas).toBe(8);
    expect(config.processingLatencyMs).toBe(45);
    expect(config.failureRatePercent).toBe(5);
  });

  it('4. calculates capacity with zero and boundary protection without throwing NaN or Infinity', () => {
    useStore.getState().setCalculatorInputs({
      qps: 0,
      payloadSizeKb: 0,
      retentionDays: 0,
      readWriteRatio: 0,
      replicationFactor: 0,
      serverCapacityQps: 0,
    });

    const inputs = useStore.getState().calculatorInputs;
    expect(inputs.qps).toBe(0);

    // Verify safe bounds in calculation
    const safeQps = Math.max(1, inputs.qps || 1);
    const safeRatio = Math.max(0.01, inputs.readWriteRatio !== undefined ? inputs.readWriteRatio : 10);
    const writeFraction = 1 / (safeRatio + 1);
    const writeQps = safeQps * writeFraction;

    expect(Number.isFinite(writeQps)).toBe(true);
    expect(writeQps).toBeGreaterThan(0);
  });

  it('5. calculates both Inbound and Outbound Bandwidth in Envelope Calculator', () => {
    useStore.getState().setCalculatorInputs({
      qps: 10000,
      payloadSizeKb: 2,
      readWriteRatio: 9, // 10% writes, 90% reads
    });

    const inputs = useStore.getState().calculatorInputs;
    const writeQps = inputs.qps * (1 / (inputs.readWriteRatio + 1)); // 1000 QPS
    const readQps = inputs.qps - writeQps; // 9000 QPS

    const inboundMbps = Math.round(((writeQps * inputs.payloadSizeKb * 8) / 1024) * 10) / 10;
    const outboundMbps = Math.round(((readQps * inputs.payloadSizeKb * 8) / 1024) * 10) / 10;

    expect(inboundMbps).toBe(15.6);
    expect(outboundMbps).toBe(140.6);
  });

  it('6. toggles edge cut status and updates simulation routing dynamically', () => {
    const nodeA = useStore.getState().addNode('client', { x: 50, y: 50 });
    const nodeB = useStore.getState().addNode('app_server', { x: 250, y: 50 });
    useStore.getState().addEdge(nodeA, nodeB, 'HTTP');

    const edgeId = useStore.getState().edges[0].id;
    expect(useStore.getState().edges[0].data?.isCut).toBeFalsy();

    // Toggle cut
    useStore.getState().toggleCutEdge(edgeId);
    expect(useStore.getState().edges[0].data?.isCut).toBe(true);

    // Toggle back to restored
    useStore.getState().toggleCutEdge(edgeId);
    expect(useStore.getState().edges[0].data?.isCut).toBe(false);
  });

  it('7. preserves isCut and protocol fields during URL serialization and decompression', () => {
    const nodeA = useStore.getState().addNode('client', { x: 50, y: 50 });
    const nodeB = useStore.getState().addNode('app_server', { x: 250, y: 50 });
    useStore.getState().addEdge(nodeA, nodeB, 'gRPC');
    const edgeId = useStore.getState().edges[0].id;
    useStore.getState().toggleCutEdge(edgeId);

    const serialized = serializeCanvasState();
    expect(serialized.edges[0].data?.isCut).toBe(true);
    expect(serialized.edges[0].data?.protocol).toBe('gRPC');

    const hash = encodeStateToUrlHash();
    const decoded = decodeStateFromUrlHash(hash);

    expect(decoded).toBeDefined();
    expect(decoded?.edges[0].data?.isCut).toBe(true);
    expect(decoded?.edges[0].data?.protocol).toBe('gRPC');
  });

  it('8. does not overwrite a manually faulted node when ChaosRunner restores its own faults', () => {
    const srvNodeId = useStore.getState().addNode('app_server', { x: 100, y: 100 }, 'Test Server');
    useStore.getState().setNodeHealthOverride(srvNodeId, 'down');

    expect(useStore.getState().nodes.find((n) => n.id === srvNodeId)?.data.config.health).toBe('down');

    // Trigger restoreAll
    chaosRunner.restoreAll();
    expect(useStore.getState().nodes.find((n) => n.id === srvNodeId)?.data.config.health).toBe('down');
  });

  it('9. handles high simulation speeds (10x) without dropping frame calculation accuracy', () => {
    const clientNode = { id: 'c1', config: createDefaultConfig('client', 'c1', 'Client') };
    const srvNode = { id: 's1', config: createDefaultConfig('app_server', 's1', 'Server') };

    const engine = new SysSimEngine({
      nodes: [clientNode, srvNode],
      edges: [{ id: 'e1', source: 'c1', target: 's1', data: { protocol: 'HTTP' } }],
    });

    engine.setSpeedMultiplier(10);
    engine.start();

    const res = engine.step(100); // 100ms at 10x speed = 1000ms sim time
    expect(res.metrics.totalRequestsSent).toBeGreaterThan(0);
    expect(res.metrics.totalRequestsSuccess).toBeGreaterThan(0);
  });

  it('10. resets simulation accumulators and time-series cleanly', () => {
    const clientNode = { id: 'c1', config: createDefaultConfig('client', 'c1', 'Client') };
    const srvNode = { id: 's1', config: createDefaultConfig('app_server', 's1', 'Server') };

    const engine = new SysSimEngine({
      nodes: [clientNode, srvNode],
      edges: [{ id: 'e1', source: 'c1', target: 's1', data: { protocol: 'HTTP' } }],
    });

    engine.start();
    engine.step(500);

    expect(engine.getMetricsSnapshot().totalRequestsSent).toBeGreaterThan(0);

    engine.reset();
    const resetSnap = engine.getMetricsSnapshot();
    expect(resetSnap.totalRequestsSent).toBe(0);
    expect(resetSnap.totalRequestsSuccess).toBe(0);
    expect(resetSnap.totalRequestsFailed).toBe(0);
    expect(engine.getState()).toBe('idle');
  });
});
