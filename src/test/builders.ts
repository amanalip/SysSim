import { SysSimEngine, SimGraph } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import { ComponentType, EdgeProtocol, EdgePurpose, TrafficConfig } from '../model/types';
import { CanvasEdge, CanvasNode } from '../store/use-store';

export function componentFixture(
  type: ComponentType,
  id = `fixture-${type}`,
  overrides: Record<string, unknown> = {},
) {
  return { ...createDefaultConfig(type, id), ...overrides };
}

export function canvasNodeFixture(
  type: ComponentType,
  id = `node-${type}`,
  overrides: Record<string, unknown> = {},
): CanvasNode {
  return {
    id,
    type: 'architectureNode',
    position: { x: 0, y: 0 },
    data: { config: componentFixture(type, id, overrides) },
  };
}

export function canvasEdgeFixture(
  source: string,
  target: string,
  protocol: EdgeProtocol = 'HTTP',
  purpose: EdgePurpose = 'request',
): CanvasEdge {
  return {
    id: `edge-${source}-${target}-${purpose}`,
    source,
    target,
    type: 'protocolEdge',
    data: { protocol, purpose },
  };
}

export function trafficFixture(overrides: Partial<TrafficConfig> = {}): TrafficConfig {
  return {
    pattern: 'steady',
    baseQps: 100,
    burstMultiplier: 3,
    rampDurationSec: 30,
    spikeFrequencySec: 10,
    seed: 42,
    requestKeyDistribution: 'uniform',
    requestKeySpaceSize: 100,
    ...overrides,
  };
}

export function linearGraphFixture(
  types: ComponentType[] = ['client', 'app_server', 'sql_db'],
): SimGraph {
  const nodes = types.map((type, index) => ({
    id: `node-${index}-${type}`,
    config: componentFixture(type, `node-${index}-${type}`),
  }));
  return {
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      id: `edge-${index}`,
      source: nodes[index].id,
      target: node.id,
      data: { protocol: 'HTTP' as const, purpose: 'request' as const },
    })),
  };
}

export function seededEngineFixture(
  graph = linearGraphFixture(),
  traffic: Partial<TrafficConfig> = {},
) {
  return new SysSimEngine(graph, trafficFixture(traffic));
}
