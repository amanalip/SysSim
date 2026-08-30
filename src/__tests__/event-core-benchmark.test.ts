import { describe, expect, it } from 'vitest';
import { SysSimEngine } from '../engine/simulator';
import { SIMULATION_LIMITS } from '../engine/simulation-limits';
import { createDefaultConfig } from '../model/component-defaults';

describe('event-core operating envelope tasks 186-188', () => {
  it('keeps UI cadence independent from simulation speed', () => {
    expect(SIMULATION_LIMITS.uiUpdateIntervalMs).toBe(100);
    const engine = new SysSimEngine({ nodes: [{ id: 'client', config: createDefaultConfig('client', 'client') }], edges: [] },
      { pattern: 'steady', baseQps: 10, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 1 });
    engine.setSpeedMultiplier(10);
    engine.start();
    expect(engine.step(SIMULATION_LIMITS.uiUpdateIntervalMs).metrics.totalRequestsSent).toBe(10);
    expect(SIMULATION_LIMITS.uiUpdateIntervalMs).toBe(100);
  });

  it('bounds events, traces, in-flight samples, node samples, and time series', () => {
    const engine = new SysSimEngine({ nodes: [{ id: 'client', config: createDefaultConfig('client', 'client') }], edges: [] },
      { pattern: 'steady', baseQps: SIMULATION_LIMITS.maxConfiguredQps, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 2 });
    engine.setSpeedMultiplier(10);
    engine.start();
    for (let index = 0; index < 70; index++) engine.step(100);
    const result = engine.step(100);
    expect(engine.getPendingEventCount()).toBeLessThanOrEqual(SIMULATION_LIMITS.maxScheduledEvents);
    expect(result.activeRequests.length).toBeLessThanOrEqual(SIMULATION_LIMITS.maxRecentRequests);
    expect(result.recentRequests.length).toBeLessThanOrEqual(SIMULATION_LIMITS.maxRecentRequests);
    expect(result.metrics.timeSeries.length).toBeLessThanOrEqual(SIMULATION_LIMITS.maxTimeSeriesPoints);
  }, 15_000);

  it('benchmarks 100 nodes at the supported 50,000 QPS limit', () => {
    const nodes = Array.from({ length: SIMULATION_LIMITS.maxNodes }, (_, index) => ({
      id: `client-${index}`,
      config: { ...createDefaultConfig('client', `client-${index}`), requestRateQps: 1 },
    }));
    const engine = new SysSimEngine({ nodes, edges: [] },
      { pattern: 'steady', baseQps: SIMULATION_LIMITS.maxConfiguredQps, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 3 });
    engine.start();
    const started = performance.now();
    const result = engine.step(100);
    const durationMs = performance.now() - started;
    expect(result.metrics.totalRequestsSent).toBe(5_000);
    expect(durationMs).toBeLessThan(5_000);
  }, 10_000);
});
