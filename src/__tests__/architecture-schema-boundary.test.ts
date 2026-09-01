import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_LIMITS,
  ARCHITECTURE_SCHEMA_VERSION,
  ArchitectureValidationError,
  formatArchitectureError,
  validateArchitectureState,
} from '../model/architecture-schema';
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
  edges: [
    {
      id: 'edge',
      source: 'source',
      target: 'target',
      data: { protocol: 'HTTP', purpose: 'request' },
    },
  ],
  zones: [
    {
      id: 'zone',
      label: 'Private',
      category: 'private',
      color: '#000',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  ],
  trafficConfig: {
    pattern: 'steady',
    baseQps: 100,
    burstMultiplier: 2,
    rampDurationSec: 10,
    spikeFrequencySec: 10,
  },
  ...overrides,
});

describe('versioned architecture schema tasks 222-236', () => {
  it('rejects malformed, partial, duplicate, unsafe, and unsupported data with field paths', () => {
    expect(() => validateArchitectureState({ nope: true })).toThrow('nodes must be an array');
    expect(() => validateArchitectureState(state({ nodes: [node('same'), node('same')] }))).toThrow(
      /nodes\[1\]\.id duplicates/,
    );
    expect(() =>
      validateArchitectureState(state({ edges: [state().edges[0], { ...state().edges[0] }] })),
    ).toThrow(/edges\[1\]\.id duplicates/);
    expect(() =>
      validateArchitectureState(state({ zones: [state().zones![0], { ...state().zones![0] }] })),
    ).toThrow(/zones\[1\]\.id duplicates/);
    const invalid = state();
    invalid.nodes[0].position.x = Number.POSITIVE_INFINITY;
    invalid.nodes[1].data.config.health = 'unknown' as never;
    invalid.nodes[1].data.config.category = 'storage';
    invalid.zones![0].width = -1;
    expect(() => validateArchitectureState(invalid)).toThrow(
      /position\.x.*finite|health.*unsupported|width.*at least/,
    );
    expect(() =>
      validateArchitectureState(
        state({ simulationMetadata: { savedAt: -1, appVersion: '1.0.0', state: 'running' } }),
      ),
    ).toThrow(/simulationMetadata\.savedAt/);
  });

  it('rejects dangling edges or repairs them only when explicitly requested', () => {
    const dangling = state({
      edges: [{ id: 'lost', source: 'source', target: 'missing', data: { protocol: 'HTTP' } }],
    });
    expect(() => validateArchitectureState(dangling)).toThrow(/references a missing node/);
    expect(validateArchitectureState(dangling, { repairDanglingEdges: true }).edges).toEqual([]);
  });

  it('enforces count, name, numeric, and traffic bounds', () => {
    expect(() =>
      validateArchitectureState(
        state({
          nodes: Array.from({ length: ARCHITECTURE_LIMITS.maxNodes + 1 }, (_, i) => node(`n${i}`)),
          edges: [],
        }),
      ),
    ).toThrow(/nodes exceeds maximum/);
    const longName = state();
    longName.nodes[0].data.config.name = 'x'.repeat(ARCHITECTURE_LIMITS.maxNameLength + 1);
    expect(() => validateArchitectureState(longName)).toThrow(/name must be a string/);
    expect(() =>
      validateArchitectureState(
        state({ trafficConfig: { ...state().trafficConfig!, baseQps: -1 } }),
      ),
    ).toThrow(/baseQps must be at least/);
  });

  it.each(Array.from({ length: ARCHITECTURE_SCHEMA_VERSION }, (_, i) => i + 1))(
    'migrates supported schema version %s',
    (version) => {
      const migrated = migrateCanvasState({
        ...state(),
        version: version as SerializedCanvasState['version'],
      });
      expect(migrated.version).toBe(ARCHITECTURE_SCHEMA_VERSION);
      expect(validateArchitectureState(migrated).nodes).toHaveLength(2);
    },
  );

  it('canonicalizes historical React Flow presentation fields during migration', () => {
    const historical = state() as SerializedCanvasState & {
      nodes: Array<SerializedCanvasState['nodes'][number] & { measured?: unknown }>;
      edges: Array<SerializedCanvasState['edges'][number] & { type?: string; selected?: boolean }>;
    };
    historical.version = 9;
    historical.nodes[0].measured = { width: 180, height: 90 };
    historical.edges[0].type = 'protocolEdge';
    historical.edges[0].selected = true;
    const migrated = migrateCanvasState(historical);
    expect(migrated.nodes[0]).not.toHaveProperty('measured');
    expect(migrated.edges[0]).not.toHaveProperty('type');
    expect(migrated.edges[0]).not.toHaveProperty('selected');
    expect(validateArchitectureState(migrated).edges).toHaveLength(1);
  });

  it('round-trips every component type, protocol, and edge purpose', () => {
    const nodes = COMPONENT_METADATA_LIST.map((metadata, index) =>
      node(`n${index}`, metadata.type),
    );
    const edges = protocols.flatMap((protocol, protocolIndex) =>
      EDGE_PURPOSES.map((purpose, purposeIndex) => ({
        id: `e${protocolIndex}_${purposeIndex}`,
        source: nodes[0].id,
        target: nodes[1].id,
        data: { protocol, purpose },
      })),
    );
    const original = state({ nodes, edges, zones: [] });
    const restored = validateArchitectureState(JSON.parse(JSON.stringify(original)));
    expect(restored.nodes.map((item) => item.data.config.type)).toEqual(
      COMPONENT_METADATA_LIST.map((item) => item.type),
    );
    expect(new Set(restored.edges.map((edge) => edge.data.protocol))).toEqual(new Set(protocols));
    expect(new Set(restored.edges.map((edge) => edge.data.purpose))).toEqual(
      new Set(EDGE_PURPOSES),
    );
  });

  it('uses a structured validation error for actionable import messages', () => {
    try {
      validateArchitectureState(
        state({
          edges: [
            {
              id: 'bad edge',
              source: 'source',
              target: 'target',
              data: { protocol: 'FTP' as never },
            },
          ],
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ArchitectureValidationError);
      expect((error as ArchitectureValidationError).issues.join(' ')).toMatch(
        /edges\[0\]\.id|edges\[0\]\.data\.protocol/,
      );
    }
  });

  it('exercises every bounded primitive and structured-value rejection branch', () => {
    const invalids: SerializedCanvasState[] = [];
    const mutate = (change: (draft: any) => void) => {
      const draft = state() as any;
      change(draft);
      invalids.push(draft);
    };
    mutate((draft) => {
      draft.nodes[0].position.x = ARCHITECTURE_LIMITS.maxCoordinate + 1;
    });
    mutate((draft) => {
      draft.nodes[0].position.y = -ARCHITECTURE_LIMITS.maxCoordinate - 1;
    });
    mutate((draft) => {
      draft.nodes[1].data.config.replicas = 'many';
    });
    mutate((draft) => {
      draft.nodes[1].data.config = createDefaultConfig('sql_db', draft.nodes[1].id);
      draft.nodes[1].data.config.automaticFailover = 'yes';
    });
    mutate((draft) => {
      draft.nodes[1].data.config = createDefaultConfig('load_balancer', draft.nodes[1].id);
      draft.nodes[1].data.config.targetWeights = [];
    });
    mutate((draft) => {
      draft.nodes[1].data.config = createDefaultConfig('load_balancer', draft.nodes[1].id);
      draft.nodes[1].data.config.algorithm = 'random';
    });
    mutate((draft) => {
      draft.nodes[1].data.config.extra = BigInt(1);
    });
    mutate((draft) => {
      draft.nodes[1].data.config.extra = [[[[[['too deep']]]]]];
    });
    mutate((draft) => {
      draft.nodes[1].data.config.extra = Array.from({ length: 1001 }, () => 1);
    });
    mutate((draft) => {
      draft.nodes[1].data.config.extra = Object.fromEntries(
        Array.from({ length: 1001 }, (_, index) => [`k${index}`, index]),
      );
    });
    mutate((draft) => {
      draft.nodes[1].data.config.name = 42;
    });
    mutate((draft) => {
      draft.appVersion = 42;
    });
    invalids.forEach((invalid, index) =>
      expect(() => validateArchitectureState(invalid), `invalid primitive ${index}`).toThrow(),
    );
  });

  it('validates all optional traffic, edge, zone, node, and metadata branches', () => {
    const valid = state({
      trafficConfig: {
        pattern: 'spike',
        baseQps: 250,
        burstMultiplier: 3,
        rampDurationSec: 20,
        spikeFrequencySec: 30,
        seed: 7,
        requestKeyDistribution: 'custom',
        requestKeySpaceSize: 20,
        customSchedule: [{ timeSec: 0, qps: 100 }],
        customRequestKeys: [{ key: 'home', weight: 2 }],
      },
      simulationMetadata: { savedAt: 100, appVersion: '1.0.0', state: 'paused' },
      appVersion: '1.0.0',
      edges: [
        {
          id: 'edge',
          source: 'source',
          target: 'target',
          data: { protocol: 'gRPC', purpose: 'replication', latencyMs: 2, bandwidthMbps: 100 },
        },
      ],
    });
    expect(validateArchitectureState(valid).trafficConfig?.seed).toBe(7);

    const malformed: Array<unknown> = [null, [], 'bad'];
    malformed.forEach((value) => expect(() => validateArchitectureState(value)).toThrow(/root/));
    expect(() => validateArchitectureState({ nodes: [], edges: 'bad' })).toThrow(/edges/);
    expect(() => validateArchitectureState({ nodes: 'bad', edges: [] })).toThrow(/nodes/);

    const mutations: Array<(draft: any) => void> = [
      (draft) => {
        draft.nodes[0] = null;
      },
      (draft) => {
        draft.nodes[0].id = 'bad id';
      },
      (draft) => {
        draft.nodes[0].data.config = null;
      },
      (draft) => {
        draft.nodes[0].data.config.type = 'unknown';
      },
      (draft) => {
        draft.nodes[0].data.config.id = 'other';
      },
      (draft) => {
        draft.nodes[0].data.config.category = 'unknown';
      },
      (draft) => {
        draft.nodes[0].data.config.health = 'unknown';
      },
      (draft) => {
        draft.nodes[0].data.config.name = '   ';
      },
      (draft) => {
        draft.edges[0] = null;
      },
      (draft) => {
        draft.edges[0].source = 'bad id';
      },
      (draft) => {
        draft.edges[0].data.protocol = 'FTP';
      },
      (draft) => {
        draft.edges[0].data.purpose = 'unknown';
      },
      (draft) => {
        draft.edges[0].data.latencyMs = -1;
      },
      (draft) => {
        draft.edges[0].data.bandwidthMbps = Infinity;
      },
      (draft) => {
        draft.zones[0].label = ' ';
      },
      (draft) => {
        draft.zones[0].category = 'unknown';
      },
      (draft) => {
        draft.zones[0].color = 4;
      },
      (draft) => {
        draft.zones[0].height = 0;
      },
      (draft) => {
        draft.trafficConfig.pattern = 'random';
      },
      (draft) => {
        draft.trafficConfig.seed = 0;
      },
      (draft) => {
        draft.trafficConfig.requestKeyDistribution = 'random';
      },
      (draft) => {
        draft.simulationMetadata = null;
      },
      (draft) => {
        draft.simulationMetadata = { savedAt: 1, appVersion: '1.0.0', state: 'finished' };
      },
    ];
    mutations.forEach((change, index) => {
      const draft = state() as any;
      change(draft);
      expect(() => validateArchitectureState(draft), `invalid structure ${index}`).toThrow();
    });
  });

  it('formats structured, native, and unknown validation failures', () => {
    expect(formatArchitectureError(new ArchitectureValidationError(['one', 'two']))).toBe(
      'Invalid architecture: one; two',
    );
    expect(formatArchitectureError(new Error('native'))).toBe('native');
    expect(formatArchitectureError('unknown')).toBe('Invalid architecture data');
  });
});
