import { describe, expect, it } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { createSimRequest } from '../engine/request';
import { createDefaultConfig } from '../model/component-defaults';
import { migrateCanvasState } from '../model/canvas-migrations';
import { validateEdgePurpose } from '../model/edge-semantics';
import { AppServerConfig, SimRequest } from '../model/types';
import { decodeStateFromUrlHash, encodeStateToUrlHash, serializeCanvasState } from '../utils/sharing';
import { useStore } from '../store/use-store';
import { SnapshotManagerModal } from '../components/modals/SnapshotManagerModal';

const app = (id: string, failureRatePercent = 0) => ({
  id,
  config: {
    ...(createDefaultConfig('app_server', id, id) as AppServerConfig),
    replicas: 1,
    failureRatePercent,
  },
});

const run = (graph: SimGraph, source: string, key = 'resource:1') => {
  const engine = new SysSimEngine(graph, {
    pattern: 'steady', baseQps: 1, burstMultiplier: 1, rampDurationSec: 1,
    spikeFrequencySec: 1, seed: 42, requestKeyDistribution: 'uniform', requestKeySpaceSize: 10,
  });
  const request = createSimRequest(source, 0, key, 1);
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return { engine, request };
};

describe('edge-purpose completion', () => {
  it('rejects contradictory purpose/component combinations', () => {
    expect(validateEdgePurpose('client', 'sql_db', 'HTTP', 'replication').valid).toBe(false);
    expect(validateEdgePurpose('client', 'app_server', 'HTTP', 'async').valid).toBe(false);
    expect(validateEdgePurpose('redis_cache', 'sql_db', 'TCP', 'request').valid).toBe(false);
    expect(validateEdgePurpose('sql_db', 'object_storage', 'TCP', 'replication').valid).toBe(true);
    expect(validateEdgePurpose('app_server', 'timeseries_db', 'HTTP', 'observability').valid).toBe(true);
  });

  it('migrates legacy edges once and preserves explicit purpose through serialization', () => {
    const nodes = [
      { id: 'cache', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: createDefaultConfig('redis_cache', 'cache') } },
      { id: 'db', type: 'customComponent', position: { x: 100, y: 0 }, data: { config: createDefaultConfig('sql_db', 'db') } },
    ];
    const legacy = migrateCanvasState({
      nodes,
      edges: [{ id: 'edge', source: 'cache', target: 'db', data: { protocol: 'TCP' } }],
    });
    expect(legacy.version).toBe(5);
    expect(legacy.edges[0].data.purpose).toBe('fallback');

    useStore.setState({ nodes: nodes as any, edges: [{ ...legacy.edges[0], type: 'protocolEdge' }] as any, zones: [] });
    expect(serializeCanvasState().edges[0].data.purpose).toBe('fallback');
    expect(decodeStateFromUrlHash(encodeStateToUrlHash())?.edges[0].data.purpose).toBe('fallback');
  });

  it('adds messaging execution defaults to older saved nodes', () => {
    const legacyQueue = createDefaultConfig('message_queue', 'queue') as any;
    delete legacyQueue.producerAckLatencyMs;
    delete legacyQueue.consumerProcessingLatencyMs;
    delete legacyQueue.deliveryGuarantee;
    delete legacyQueue.retryDelayMs;
    delete legacyQueue.retentionHours;
    delete legacyQueue.overflowPolicy;
    const migrated = migrateCanvasState({
      version: 2,
      nodes: [{ id: 'queue', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: legacyQueue } }],
      edges: [],
    });
    const config = migrated.nodes[0].data.config as any;
    expect(migrated.version).toBe(5);
    expect(config.producerAckLatencyMs).toBe(4);
    expect(config.consumerProcessingLatencyMs).toBe(10);
    expect(config.deliveryGuarantee).toBe('at_least_once');
    expect(config.retryDelayMs).toBe(100);
    expect(config.retentionHours).toBe(72);
    expect(config.overflowPolicy).toBe('reject_newest');
  });

  it('adds client workload defaults to older saved nodes', () => {
    const legacyClient = createDefaultConfig('client', 'client') as any;
    delete legacyClient.requestPayloadKb;
    delete legacyClient.operationType;
    delete legacyClient.readPercentage;
    delete legacyClient.requestKeyDistribution;
    delete legacyClient.requestKeySpaceSize;
    const migrated = migrateCanvasState({
      version: 3,
      nodes: [{ id: 'client', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: legacyClient } }],
      edges: [],
    });
    expect(migrated.version).toBe(5);
    expect(migrated.nodes[0].data.config).toMatchObject({
      requestPayloadKb: 2,
      operationType: 'mixed',
      readPercentage: 80,
      requestKeyDistribution: 'uniform',
      requestKeySpaceSize: 100,
    });
  });

  it('adds compute execution defaults to older saved nodes', () => {
    const worker = createDefaultConfig('worker', 'worker') as any;
    const serverless = createDefaultConfig('serverless', 'function') as any;
    delete worker.processingLatencyMs;
    delete serverless.baseExecutionLatencyMs;
    delete serverless.warmInstances;
    delete serverless.idleTimeoutSec;
    const migrated = migrateCanvasState({
      version: 4,
      nodes: [
        { id: 'worker', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: worker } },
        { id: 'function', type: 'customComponent', position: { x: 100, y: 0 }, data: { config: serverless } },
      ],
      edges: [],
    });
    expect(migrated.version).toBe(5);
    expect(migrated.nodes[0].data.config).toMatchObject({ processingLatencyMs: 20 });
    expect(migrated.nodes[1].data.config).toMatchObject({
      baseExecutionLatencyMs: 25, warmInstances: 0, idleTimeoutSec: 300,
    });
  });

  it('preserves purpose in locally saved snapshot slots', () => {
    localStorage.removeItem('syssim_architecture_snapshots');
    const nodes = [
      { id: 'app', type: 'customComponent', position: { x: 0, y: 0 }, data: { config: createDefaultConfig('app_server', 'app') } },
      { id: 'queue', type: 'customComponent', position: { x: 100, y: 0 }, data: { config: createDefaultConfig('message_queue', 'queue') } },
    ];
    useStore.setState({
      nodes: nodes as any,
      edges: [{ id: 'edge', source: 'app', target: 'queue', type: 'protocolEdge', data: { protocol: 'pub/sub', purpose: 'async' } }],
      zones: [],
    });
    render(React.createElement(SnapshotManagerModal, { isOpen: true, onClose: () => undefined }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    const slots = JSON.parse(localStorage.getItem('syssim_architecture_snapshots') || '[]');
    expect(slots[0].edges[0].data.purpose).toBe('async');
  });

  it('preserves purpose through undo and redo', () => {
    useStore.setState({ nodes: [], edges: [], zones: [], historyPast: [], historyFuture: [] });
    const source = useStore.getState().addNode('app_server', { x: 0, y: 0 });
    const target = useStore.getState().addNode('sql_db', { x: 100, y: 0 });
    useStore.getState().addEdge(source, target, 'HTTP', 'request');
    const edgeId = useStore.getState().edges[0].id;
    useStore.getState().updateEdgePurpose(edgeId, 'fallback');
    expect(useStore.getState().edges[0].data.purpose).toBe('fallback');
    useStore.getState().undo();
    expect(useStore.getState().edges[0].data.purpose).toBe('request');
    useStore.getState().redo();
    expect(useStore.getState().edges[0].data.purpose).toBe('fallback');
  });

  it('produces identical route counts and failures for the same seed', () => {
    const graph: SimGraph = {
      nodes: [app('source'), app('a', 35), app('b', 35), { id: 'db', config: createDefaultConfig('sql_db', 'db') }],
      edges: [
        { id: 'a', source: 'source', target: 'a', data: { protocol: 'HTTP', purpose: 'fanout' } },
        { id: 'b', source: 'source', target: 'b', data: { protocol: 'HTTP', purpose: 'fanout' } },
        { id: 'db', source: 'a', target: 'db', data: { protocol: 'TCP', purpose: 'request' } },
      ],
    };
    const first = new SysSimEngine(graph, { pattern: 'steady', baseQps: 20, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 77 });
    const second = new SysSimEngine(graph, { pattern: 'steady', baseQps: 20, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 77 });
    first.start(); second.start();
    first.step(1000); second.step(1000);
    expect(first.getMetricsSnapshot()).toEqual(second.getMetricsSnapshot());
  });

  it('terminates cycles as an error through the documented hop TTL', () => {
    const graph: SimGraph = {
      nodes: [app('a'), app('b')],
      edges: [
        { id: 'ab', source: 'a', target: 'b', data: { protocol: 'HTTP', purpose: 'request' } },
        { id: 'ba', source: 'b', target: 'a', data: { protocol: 'HTTP', purpose: 'request' } },
      ],
    };
    const { request } = run(graph, 'a');
    expect(request.status).toBe('error');
    expect(request.path.at(-1)?.info).toContain('cycle detected');
  });

  it('treats a disconnected root as a successful terminal path', () => {
    const { request } = run({ nodes: [app('root'), app('island')], edges: [] }, 'root');
    expect(request.status).toBe('success');
    expect(request.path.map((hop) => hop.nodeId)).toEqual(['root']);
  });
});
