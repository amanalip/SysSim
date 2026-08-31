import { describe, expect, it } from 'vitest';
import { SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import { TrafficConfig } from '../model/types';
import { serializeCanvasState } from '../utils/sharing';
import { useStore } from '../store/use-store';

const graph = {
  nodes: [
    { id: 'client', config: createDefaultConfig('client', 'client') },
    { id: 'waf', config: { ...createDefaultConfig('firewall', 'waf'), blockRatePercent: 50 } },
  ],
  edges: [
    {
      id: 'edge',
      source: 'client',
      target: 'waf',
      data: { protocol: 'HTTP' as const, purpose: 'request' as const, latencyMs: 3 },
    },
  ],
};
const run = (seed: number) => {
  const config: TrafficConfig = {
    pattern: 'steady',
    baseQps: 100,
    burstMultiplier: 1,
    rampDurationSec: 1,
    spikeFrequencySec: 1,
    seed,
  };
  const engine = new SysSimEngine(structuredClone(graph), config);
  engine.start();
  const result = engine.step(1000);
  return {
    statuses: result.recentRequests.map((request) => request.status),
    metrics: result.metrics,
  };
};

describe('seed tasks 173-178', () => {
  it('replays identical graph, configuration, seed, and steps exactly', () => {
    expect(run(12345)).toEqual(run(12345));
  });

  it('different seeds vary probabilistic results within a broad expected bound', () => {
    const first = run(100);
    const second = run(200);
    expect(first.statuses).not.toEqual(second.statuses);
    for (const result of [first, second]) {
      expect(result.metrics.totalRequestsSuccess).toBeGreaterThan(25);
      expect(result.metrics.totalRequestsSuccess).toBeLessThan(75);
    }
  });

  it('includes the active seed in architecture JSON state', () => {
    useStore.setState({ trafficConfig: { ...useStore.getState().trafficConfig, seed: 987654 } });
    expect(serializeCanvasState().trafficConfig?.seed).toBe(987654);
  });
});
