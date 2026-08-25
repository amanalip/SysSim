import { describe, it, expect } from 'vitest';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';

describe('Simulation Engine Core Tests (Milestone 6)', () => {
  it('initializes in idle state and transitions properly', () => {
    const engine = new SysSimEngine();
    expect(engine.getState()).toBe('idle');

    engine.start();
    expect(engine.getState()).toBe('running');

    engine.pause();
    expect(engine.getState()).toBe('paused');

    engine.resume();
    expect(engine.getState()).toBe('running');

    engine.reset();
    expect(engine.getState()).toBe('idle');
  });

  it('routes requests across a multi-node pipeline and records latencies', () => {
    const clientConfig = createDefaultConfig('client', 'n_client');
    const lbConfig = createDefaultConfig('load_balancer', 'n_lb');
    const appConfig = createDefaultConfig('app_server', 'n_app');
    const dbConfig = createDefaultConfig('sql_db', 'n_db');

    const graph: SimGraph = {
      nodes: [
        { id: 'n_client', config: clientConfig },
        { id: 'n_lb', config: lbConfig },
        { id: 'n_app', config: appConfig },
        { id: 'n_db', config: dbConfig },
      ],
      edges: [
        { id: 'e1', source: 'n_client', target: 'n_lb', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'n_lb', target: 'n_app', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'n_app', target: 'n_db', data: { protocol: 'gRPC' } },
      ],
    };

    const engine = new SysSimEngine(graph, {
      pattern: 'steady',
      baseQps: 100,
      burstMultiplier: 2,
      rampDurationSec: 10,
      spikeFrequencySec: 10,
    });

    engine.start();

    // Step by 500ms
    const result = engine.step(500);

    expect(result.metrics.totalRequestsSent).toBeGreaterThan(0);
    expect(result.metrics.totalRequestsSuccess).toBeGreaterThan(0);
    expect(result.metrics.avgEndToEndLatencyMs).toBeGreaterThan(0);
    expect(result.activeRequests.length).toBeGreaterThan(0);

    // Verify request hops
    const sampleReq = result.activeRequests[0];
    expect(sampleReq.path.length).toBe(4);
    expect(sampleReq.path[0].nodeId).toBe('n_client');
    expect(sampleReq.path[1].nodeId).toBe('n_lb');
    expect(sampleReq.path[2].nodeId).toBe('n_app');
    expect(sampleReq.path[3].nodeId).toBe('n_db');
  });

  it('calculates traffic patterns accurately', () => {
    const engine = new SysSimEngine(undefined, {
      pattern: 'steady',
      baseQps: 500,
      burstMultiplier: 3,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    });

    expect(engine.getCurrentQps(5)).toBe(500);

    engine.setConfig({ pattern: 'bursty', burstMultiplier: 4 });
    expect(engine.getCurrentQps(6)).toBe(2000); // cycle 1 active at elapsedSec = 6
  });
});
