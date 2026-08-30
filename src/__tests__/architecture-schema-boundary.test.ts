import { describe, expect, it } from 'vitest';
import { ARCHITECTURE_LIMITS, ARCHITECTURE_SCHEMA_VERSION, ArchitectureValidationError, validateArchitectureState } from '../model/architecture-schema';
import { migrateCanvasState } from '../model/canvas-migrations';
import { COMPONENT_METADATA_LIST, createDefaultConfig } from '../model/component-defaults';
import { EDGE_PURPOSES } from '../model/edge-semantics';
import { EdgeProtocol, SerializedCanvasState } from '../model/types';

const protocols: EdgeProtocol[] = ['HTTP', 'gRPC', 'WebSocket', 'TCP', 'UDP', 'pub/sub', 'MQTT'];
const node = (id: string, type = 'app_server') => ({
  id,
  type: 'customComponent',
  position: { x: 10, y: 20 },
  data: { config: createDefaultConfig(type as Parameters<typeof createDefaultConfig>[0], id) },
});
const state = (overrides: Partial<SerializedCanvasState> = {}): SerializedCanvasState => ({
  version: ARCHITECTURE_SCHEMA_VERSION,
  nodes: [node('source', 'client'), node('target')],
  edges: [{ id: 'edge', source: 'source', target: 'target', data: { protocol: 'HTTP', purpose: 'request' } }],
  zones: [{ id: 'zone', label: 'Private', category: 'private', color: '#000', x: 0, y: 0, width: 100, height: 100 }],
  trafficConfig: { pattern: 'steady', baseQps: 100, burstMultiplier: 2, rampDurationSec: 10, spikeFrequencySec: 10 },
  ...overrides,
});

describe('versioned architecture schema tasks 222-236', () => {
  it('rejects malformed, partial, duplicate, unsafe, and unsupported data with field paths', () => {
    expect(() => validateArchitectureState({ nope: true })).toThrow('nodes must be an array');
    expect(() => validateArchitectureState(state({ nodes: [node('same'), node('same')] }))).toThrow(/nodes\[1\]\.id duplicates/);
    expect(() => validateArchitectureState(state({ edges: [state().edges[0], { ...state().edges[0] }] }))).toThrow(/edges\[1\]\.id duplicates/);
    expect(() => validateArchitectureState(state({ zones: [state().zones![0], { ...state().zones![0] }] }))).toThrow(/zones\[1\]\.id duplicates/);
    const invalid = state();
    invalid.nodes[0].position.x = Number.POSITIVE_INFINITY;
    invalid.nodes[1].data.config.health = 'unknown' as never;
    invalid.nodes[1].data.config.category = 'storage';
    invalid.zones![0].width = -1;
    expect(() => validateArchitectureState(invalid)).toThrow(/position\.x.*finite|health.*unsupported|width.*at least/);
    expect(() => validateArchitectureState(state({ simulationMetadata: { savedAt: -1, appVersion: '1.0.0', state: 'running' } }))).toThrow(/simulationMetadata\.savedAt/);
  });

  it('rejects dangling edges or repairs them only when explicitly requested', () => {
    const dangling = state({ edges: [{ id: 'lost', source: 'source', target: 'missing', data: { protocol: 'HTTP' } }] });
    expect(() => validateArchitectureState(dangling)).toThrow(/references a missing node/);
    expect(validateArchitectureState(dangling, { repairDanglingEdges: true }).edges).toEqual([]);
  });

  it('enforces count, name, numeric, and traffic bounds', () => {
    expect(() => validateArchitectureState(state({ nodes: Array.from({ length: ARCHITECTURE_LIMITS.maxNodes + 1 }, (_, i) => node(`n${i}`)), edges: [] }))).toThrow(/nodes exceeds maximum/);
    const longName = state();
    longName.nodes[0].data.config.name = 'x'.repeat(ARCHITECTURE_LIMITS.maxNameLength + 1);
    expect(() => validateArchitectureState(longName)).toThrow(/name must be a string/);
    expect(() => validateArchitectureState(state({ trafficConfig: { ...state().trafficConfig!, baseQps: -1 } }))).toThrow(/baseQps must be at least/);
  });

  it.each(Array.from({ length: ARCHITECTURE_SCHEMA_VERSION }, (_, i) => i + 1))('migrates supported schema version %s', (version) => {
    const migrated = migrateCanvasState({ ...state(), version: version as SerializedCanvasState['version'] });
    expect(migrated.version).toBe(ARCHITECTURE_SCHEMA_VERSION);
    expect(validateArchitectureState(migrated).nodes).toHaveLength(2);
  });

  it('round-trips every component type, protocol, and edge purpose', () => {
    const nodes = COMPONENT_METADATA_LIST.map((metadata, index) => node(`n${index}`, metadata.type));
    const edges = protocols.flatMap((protocol, protocolIndex) => EDGE_PURPOSES.map((purpose, purposeIndex) => ({
      id: `e${protocolIndex}_${purposeIndex}`,
      source: nodes[0].id,
      target: nodes[1].id,
      data: { protocol, purpose },
    })));
    const original = state({ nodes, edges, zones: [] });
    const restored = validateArchitectureState(JSON.parse(JSON.stringify(original)));
    expect(restored.nodes.map((item) => item.data.config.type)).toEqual(COMPONENT_METADATA_LIST.map((item) => item.type));
    expect(new Set(restored.edges.map((edge) => edge.data.protocol))).toEqual(new Set(protocols));
    expect(new Set(restored.edges.map((edge) => edge.data.purpose))).toEqual(new Set(EDGE_PURPOSES));
  });

  it('uses a structured validation error for actionable import messages', () => {
    try { validateArchitectureState(state({ edges: [{ id: 'bad edge', source: 'source', target: 'target', data: { protocol: 'FTP' as never } }] })); }
    catch (error) {
      expect(error).toBeInstanceOf(ArchitectureValidationError);
      expect((error as ArchitectureValidationError).issues.join(' ')).toMatch(/edges\[0\]\.id|edges\[0\]\.data\.protocol/);
    }
  });
});
