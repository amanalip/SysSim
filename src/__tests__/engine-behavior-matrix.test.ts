import { describe, expect, it, vi } from 'vitest';
import { COMPONENT_METADATA_LIST } from '../model/component-defaults';
import { seededEngineFixture, trafficFixture } from '../test/builders';
import { SysSimEngine, SimGraph } from '../engine/simulator';

const topologyBoundaryCases: Array<[string, SimGraph]> = [
  ['disconnected', { nodes: [], edges: [] }],
  ['dangling edge', { nodes: [], edges: [{ id: 'e', source: 'missing-a', target: 'missing-b', data: { protocol: 'HTTP' } }] }],
  ['self-loop', { nodes: [{ id: 'client', config: COMPONENT_METADATA_LIST[0].defaultConfig('client') }], edges: [{ id: 'e', source: 'client', target: 'client', data: { protocol: 'HTTP' } }] }],
];

describe('engine public behavior matrix', () => {
  it.each(COMPONENT_METADATA_LIST.map(({ type }) => [type]))(
    'initializes and resets the %s component model with its complete default config',
    (type) => {
      const engine = seededEngineFixture(undefined, { baseQps: 1 });
      const config = COMPONENT_METADATA_LIST.find((item) => item.type === type)!.defaultConfig(`node-${type}`);
      const graph: SimGraph = { nodes: [{ id: config.id, config }], edges: [] };

      expect(() => engine.setGraph(graph)).not.toThrow();
      engine.start();
      expect(() => engine.step(1_000)).not.toThrow();
      expect(() => engine.reset()).not.toThrow();
    },
  );

  it.each([
    ['steady', 0, 100],
    ['bursty', 4.999, 100],
    ['bursty', 5, 300],
    ['ramp', 0, 20],
    ['ramp', 30, 100],
    ['spike', 0, 500],
    ['spike', 1, 100],
  ] as const)('calculates %s traffic at boundary second %s', (pattern, second, expected) => {
    const engine = new SysSimEngine(undefined, trafficFixture({ pattern }));
    expect(engine.getCurrentQps(second)).toBe(expected);
  });

  it('uses the most recent custom schedule entry and preserves fractional QPS', () => {
    const engine = new SysSimEngine(undefined, trafficFixture({
      pattern: 'custom',
      baseQps: 0.5,
      customSchedule: [{ timeSec: 0, qps: 0.5 }, { timeSec: 10, qps: 50_000 }],
    }));
    expect(engine.getCurrentQps(9.999)).toBe(0.5);
    expect(engine.getCurrentQps(10)).toBe(50_000);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'does not throw when fault-injected with invalid QPS %s',
    (qps) => {
      const engine = seededEngineFixture();
      vi.spyOn(engine, 'getCurrentQps').mockReturnValue(qps);
      engine.start();
      expect(() => engine.step(10)).not.toThrow();
    },
  );

  it.each(topologyBoundaryCases)('fails safely for a %s graph', (_name, graph) => {
    const engine = new SysSimEngine(graph, trafficFixture({ baseQps: 1 }));
    engine.start();
    expect(() => engine.step(1_000)).not.toThrow();
  });

  it('handles a deep cyclic path without recursive overflow', () => {
    const nodes = Array.from({ length: 80 }, (_, index) => ({
      id: `node-${index}`,
      config: COMPONENT_METADATA_LIST[1].defaultConfig(`node-${index}`),
    }));
    const graph: SimGraph = {
      nodes,
      edges: [
        ...nodes.slice(1).map((node, index) => ({ id: `edge-${index}`, source: nodes[index].id, target: node.id, data: { protocol: 'HTTP' as const } })),
        { id: 'cycle', source: nodes.at(-1)!.id, target: nodes[0].id, data: { protocol: 'HTTP' as const } },
      ],
    };
    const engine = new SysSimEngine(graph, trafficFixture({ baseQps: 1 }));
    engine.start();
    expect(() => engine.step(1_000)).not.toThrow();
  });

  it('covers start, pause, resume, stop, reset, and graph mutation states', () => {
    const engine = seededEngineFixture();
    engine.start();
    expect(engine.getState()).toBe('running');
    engine.pause();
    expect(engine.step(100).metrics.totalRequestsSent).toBe(0);
    engine.resume();
    engine.setGraph({ nodes: [], edges: [] });
    engine.stop();
    expect(engine.getState()).toBe('stopped');
    engine.reset();
    expect(engine.getState()).toBe('idle');
  });

  it('replays the same seeded simulation exactly', () => {
    const first = seededEngineFixture();
    const second = seededEngineFixture();
    first.start();
    second.start();
    expect(first.step(1_000)).toEqual(second.step(1_000));
  });
});
