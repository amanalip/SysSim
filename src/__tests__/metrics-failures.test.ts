import { describe, it, expect, beforeEach } from 'vitest';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import { useStore } from '../store/use-store';

describe('Failure Injection & Metrics Telemetry Tests (Milestones 10 and 11)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('drops traffic and increments failure count when component is marked down', () => {
    const client = createDefaultConfig('client', 'c1');
    const app = createDefaultConfig('app_server', 'a1');
    app.health = 'down'; // Mark down

    const graph: SimGraph = {
      nodes: [
        { id: 'c1', config: client },
        { id: 'a1', config: app },
      ],
      edges: [{ id: 'e1', source: 'c1', target: 'a1', data: { protocol: 'HTTP' } }],
    };

    const engine = new SysSimEngine(graph, {
      pattern: 'steady',
      baseQps: 100,
      burstMultiplier: 2,
      rampDurationSec: 10,
      spikeFrequencySec: 10,
    });

    engine.start();
    const result = engine.step(500);

    expect(result.metrics.totalRequestsFailed).toBeGreaterThan(0);
    expect(result.metrics.overallErrorRatePercent).toBe(100);
    expect(result.metrics.componentMetrics['a1'].errorRatePercent).toBe(100);
  });

  it('respects network partitions (cut edges)', () => {
    const client = createDefaultConfig('client', 'c1');
    const app = createDefaultConfig('app_server', 'a1');

    const graph: SimGraph = {
      nodes: [
        { id: 'c1', config: client },
        { id: 'a1', config: app },
      ],
      edges: [{ id: 'e1', source: 'c1', target: 'a1', data: { protocol: 'HTTP', isCut: true } }],
    };

    const engine = new SysSimEngine(graph, {
      pattern: 'steady',
      baseQps: 100,
      burstMultiplier: 2,
      rampDurationSec: 10,
      spikeFrequencySec: 10,
    });

    engine.start();
    const result = engine.step(500);

    // Traffic stopped at client because edge is severed
    expect(result.metrics.componentMetrics['a1'].totalRequests).toBe(0);
  });

  it('aggregates time-series and per-component metrics', () => {
    const client = createDefaultConfig('client', 'c1');
    const cache = createDefaultConfig('redis_cache', 'r1');

    const graph: SimGraph = {
      nodes: [
        { id: 'c1', config: client },
        { id: 'r1', config: cache },
      ],
      edges: [{ id: 'e1', source: 'c1', target: 'r1', data: { protocol: 'TCP' } }],
    };

    const engine = new SysSimEngine(graph, {
      pattern: 'steady',
      baseQps: 200,
      burstMultiplier: 2,
      rampDurationSec: 10,
      spikeFrequencySec: 10,
    });

    engine.start();
    // Step by 2 seconds to produce time series points
    engine.step(1000);
    const result = engine.step(1000);

    expect(result.metrics.timeSeries.length).toBeGreaterThan(0);
    expect(result.metrics.componentMetrics['r1'].qps).toBeGreaterThan(0);
  });
});
