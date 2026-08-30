import { describe, expect, it } from 'vitest';
import { EventPriorityQueue, SimulationEventKind } from '../engine/event-queue';
import { createSimRequest } from '../engine/request';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import { TrafficConfig } from '../model/types';

const traffic = (baseQps: number, seed = 19): TrafficConfig => ({ pattern: 'steady', baseQps, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed });

describe('discrete-event tasks 179-185', () => {
  it('orders every event category by timestamp and stable insertion order', () => {
    const queue = new EventPriorityQueue();
    const kinds: SimulationEventKind[] = ['arrival', 'node_service_completion', 'edge_transfer', 'timeout', 'retry', 'queue_drain', 'recovery'];
    kinds.forEach((kind, index) => queue.schedule(index === 0 ? 2 : 1, kind, null));
    const observed: SimulationEventKind[] = [];
    queue.drainUntil(2, (event) => observed.push(event.kind));
    expect(observed).toEqual([...kinds.slice(1), 'arrival']);
  });

  it('keeps a request genuinely in flight until its scheduled completion', () => {
    const graph: SimGraph = {
      nodes: [{ id: 'client', config: createDefaultConfig('client', 'client') }, { id: 'app', config: createDefaultConfig('app_server', 'app') }],
      edges: [{ id: 'slow-link', source: 'client', target: 'app', data: { protocol: 'HTTP', purpose: 'request', latencyMs: 1000 } }],
    };
    const engine = new SysSimEngine(graph, traffic(1));
    engine.start();
    const midway = engine.step(1000);
    expect(midway.activeRequests).toHaveLength(1);
    expect(midway.activeRequests[0].status).toBe('in_flight');
    const firstRequestId = midway.activeRequests[0].id;
    expect(midway.recentRequests).toHaveLength(0);
    expect(engine.getPendingEventKinds()).toEqual(expect.arrayContaining(['edge_transfer', 'node_service_completion', 'request_completion']));
    const completed = engine.step(1000);
    expect(completed.activeRequests.some((request) => request.id === firstRequestId)).toBe(false);
    expect(completed.recentRequests.find((request) => request.id === firstRequestId)?.status).toBe('success');
  });

  it('joins concurrent fanout branches at the slowest branch rather than summing them', () => {
    const app = (id: string, processingLatencyMs: number) => ({ ...createDefaultConfig('app_server', id), processingLatencyMs });
    const engine = new SysSimEngine({
      nodes: [{ id: 'root', config: app('root', 20) }, { id: 'fast', config: app('fast', 10) }, { id: 'slow', config: app('slow', 30) }],
      edges: [
        { id: 'fast-edge', source: 'root', target: 'fast', data: { protocol: 'HTTP', purpose: 'fanout', latencyMs: 0 } },
        { id: 'slow-edge', source: 'root', target: 'slow', data: { protocol: 'HTTP', purpose: 'fanout', latencyMs: 0 } },
      ],
    }, traffic(0));
    const request = createSimRequest('root', 0, 'key', 1);
    engine.processRequest(request);
    expect(request.totalLatencyMs).toBe(50);
    expect(request.path.map((hop) => hop.nodeId)).toEqual(['root', 'fast', 'slow']);
  });

  it('samples configured latency distributions reproducibly within their bounds', () => {
    const config = { ...createDefaultConfig('client', 'client'), latencyDistribution: 'uniform' as const, latencyJitterPercent: 20 };
    const sample = (seed: number) => {
      const engine = new SysSimEngine({ nodes: [{ id: 'client', config }], edges: [] }, traffic(0, seed));
      return Array.from({ length: 12 }, (_, index) => {
        const request = createSimRequest('client', index, 'key', index);
        engine.processRequest(request);
        return request.totalLatencyMs;
      });
    };
    const first = sample(44);
    expect(first).toEqual(sample(44));
    expect(new Set(first).size).toBeGreaterThan(5);
    first.forEach((latency) => expect(latency).toBeGreaterThanOrEqual(1.6));
    first.forEach((latency) => expect(latency).toBeLessThanOrEqual(2.4));
  });
});
