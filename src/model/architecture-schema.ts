import { COMPONENT_METADATA_LIST, createDefaultConfig } from './component-defaults';
import { EDGE_PURPOSES } from './edge-semantics';
import { EdgeProtocol, SerializedCanvasState, TrafficConfig, ZoneData } from './types';
import {
  assertAllowedKeys,
  assertSafeUntrustedValue,
  isPlainRecord,
} from '../security/untrusted-data';

export const ARCHITECTURE_SCHEMA_VERSION = 10 as const;
export const APPLICATION_VERSION = '1.0.0';
export const ARCHITECTURE_LIMITS = {
  maxNodes: 100,
  maxEdges: 500,
  maxZones: 100,
  maxNameLength: 120,
  maxTextLength: 2_000,
  maxImportBytes: 1_000_000,
  maxDecompressedUrlBytes: 2_000_000,
  maxCoordinate: 1_000_000,
  maxNumericValue: 1_000_000_000,
} as const;

const COMPONENT_TYPES = new Set(COMPONENT_METADATA_LIST.map((item) => item.type));
const COMPONENT_CATEGORIES = new Map(
  COMPONENT_METADATA_LIST.map((item) => [item.type, item.category]),
);
const CATEGORIES = new Set([
  'compute',
  'networking',
  'storage',
  'caching',
  'messaging',
  'security',
]);
const HEALTH = new Set(['healthy', 'degraded', 'down', 'overloaded']);
export const SUPPORTED_EDGE_PROTOCOLS: readonly EdgeProtocol[] = [
  'HTTP',
  'gRPC',
  'WebSocket',
  'TCP',
  'UDP',
  'pub/sub',
  'MQTT',
];
const PROTOCOLS = new Set<EdgeProtocol>(SUPPORTED_EDGE_PROTOCOLS);
const ZONE_CATEGORIES = new Set<ZoneData['category']>(['public', 'private', 'data', 'edge']);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
export const ARCHITECTURE_ROOT_KEYS = new Set([
  'version',
  'appVersion',
  'nodes',
  'edges',
  'zones',
  'trafficConfig',
  'simulationMetadata',
]);
const NODE_KEYS = new Set(['id', 'type', 'position', 'data']);
const POSITION_KEYS = new Set(['x', 'y']);
const NODE_DATA_KEYS = new Set(['config']);
const EDGE_KEYS = new Set(['id', 'source', 'target', 'sourceHandle', 'targetHandle', 'data']);
const EDGE_DATA_KEYS = new Set(['protocol', 'purpose', 'bandwidthMbps', 'latencyMs', 'isCut']);
const ZONE_KEYS = new Set(['id', 'label', 'category', 'color', 'x', 'y', 'width', 'height']);
const TRAFFIC_KEYS = new Set([
  'pattern',
  'baseQps',
  'burstMultiplier',
  'rampDurationSec',
  'spikeFrequencySec',
  'customSchedule',
  'seed',
  'requestKeyDistribution',
  'requestKeySpaceSize',
  'customRequestKeys',
]);
const SIMULATION_METADATA_KEYS = new Set(['savedAt', 'appVersion', 'state']);
const ENUM_VALUES: Record<string, ReadonlySet<string>> = {
  connectionType: new Set(['HTTP/2', 'HTTP/3', 'WebSocket']),
  operationType: new Set(['read', 'write', 'mixed']),
  requestKeyDistribution: new Set(['uniform', 'zipfian', 'custom']),
  algorithm: new Set([
    'round_robin',
    'least_connections',
    'consistent_hashing',
    'weighted',
    'ip_hash',
    'token_bucket',
    'sliding_window',
    'fixed_window',
    'leaky_bucket',
    'AES-256-GCM',
    'ChaCha20-Poly1305',
    'RSA-4096',
  ]),
  authMode: new Set(['JWT', 'API_Key', 'OAuth2', 'None']),
  routingPolicy: new Set(['simple', 'weighted', 'geolocation', 'latency_based']),
  isolationLevel: new Set(['Read Committed', 'Repeatable Read', 'Serializable']),
  consistencyLevel: new Set(['eventual', 'strong', 'session', 'bounded_staleness']),
  storageClass: new Set(['Standard', 'Infrequent', 'Glacier']),
  evictionPolicy: new Set(['LRU', 'LFU', 'TTL', 'FIFO']),
  orderingGuarantee: new Set(['FIFO', 'Partition Key', 'None']),
  overflowPolicy: new Set(['reject_newest', 'drop_oldest']),
  deliveryGuarantee: new Set(['at_most_once', 'at_least_once', 'exactly_once']),
  tokenType: new Set(['JWT', 'Session', 'Paseto']),
  latencyDistribution: new Set(['fixed', 'uniform', 'normal', 'lognormal']),
};

export class ArchitectureValidationError extends Error {
  public constructor(public readonly issues: string[]) {
    super(issues.join('; '));
    this.name = 'ArchitectureValidationError';
  }
}

function finiteNumber(
  value: unknown,
  path: string,
  issues: string[],
  options: { min?: number; max?: number } = {},
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`);
    return false;
  }
  if (options.min !== undefined && value < options.min)
    issues.push(`${path} must be at least ${options.min}`);
  if (options.max !== undefined && value > options.max)
    issues.push(`${path} must be at most ${options.max}`);
  return true;
}

function boundedString(
  value: unknown,
  path: string,
  issues: string[],
  max: number = ARCHITECTURE_LIMITS.maxTextLength,
): value is string {
  if (typeof value !== 'string' || value.length > max) {
    issues.push(`${path} must be a string of at most ${max} characters`);
    return false;
  }
  return true;
}

function validateId(value: unknown, path: string, issues: string[]): value is string {
  if (!boundedString(value, path, issues, ARCHITECTURE_LIMITS.maxNameLength)) return false;
  if (!ID_PATTERN.test(value)) issues.push(`${path} contains unsupported characters`);
  return true;
}

function validateStructuredValue(value: unknown, path: string, issues: string[], depth = 0): void {
  if (depth > 4) {
    issues.push(`${path} exceeds maximum nesting depth`);
    return;
  }
  if (typeof value === 'number')
    return void finiteNumber(value, path, issues, {
      min: 0,
      max: ARCHITECTURE_LIMITS.maxNumericValue,
    });
  if (typeof value === 'string') return void boundedString(value, path, issues);
  if (typeof value === 'boolean' || value === undefined || value === null) return;
  if (Array.isArray(value)) {
    if (value.length > 1_000) {
      issues.push(`${path} must contain at most 1000 items`);
      return;
    }
    value.forEach((item, index) =>
      validateStructuredValue(item, `${path}[${index}]`, issues, depth + 1),
    );
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 1_000) {
      issues.push(`${path} must contain at most 1000 fields`);
      return;
    }
    entries.forEach(([key, item]) =>
      validateStructuredValue(item, `${path}.${key}`, issues, depth + 1),
    );
    return;
  }
  issues.push(`${path} contains an unsupported value`);
}

function validateValueAgainstDefault(
  value: unknown,
  template: unknown,
  path: string,
  issues: string[],
  key: string,
): void {
  if (template === undefined || value === undefined) return;
  if (typeof template === 'number') {
    finiteNumber(value, path, issues, {
      min: 0,
      max:
        key.endsWith('Percent') || key === 'readPercentage'
          ? 100
          : ARCHITECTURE_LIMITS.maxNumericValue,
    });
  } else if (typeof template === 'string') {
    boundedString(value, path, issues);
    if (typeof value === 'string' && ENUM_VALUES[key] && !ENUM_VALUES[key].has(value))
      issues.push(`${path} is unsupported`);
  } else if (typeof template === 'boolean') {
    if (typeof value !== 'boolean') issues.push(`${path} must be a boolean`);
  } else if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length > 1_000)
      issues.push(`${path} must be an array with at most 1000 items`);
    else validateStructuredValue(value, path, issues);
  } else if (template && typeof template === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      issues.push(`${path} must be an object`);
    else validateStructuredValue(value, path, issues);
  }
}

function validateTraffic(value: unknown, path: string, issues: string[]): value is TrafficConfig {
  if (!isPlainRecord(value)) {
    issues.push(`${path} must be an object`);
    return false;
  }
  try {
    assertAllowedKeys(value, TRAFFIC_KEYS, path);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : `${path} contains unexpected fields`);
  }
  const traffic = value as Partial<TrafficConfig>;
  if (!['steady', 'bursty', 'ramp', 'spike'].includes(String(traffic.pattern)))
    issues.push(`${path}.pattern is unsupported`);
  finiteNumber(traffic.baseQps, `${path}.baseQps`, issues, { min: 0, max: 50_000 });
  if (traffic.burstMultiplier !== undefined)
    finiteNumber(traffic.burstMultiplier, `${path}.burstMultiplier`, issues, { min: 0, max: 100 });
  if (traffic.rampDurationSec !== undefined)
    finiteNumber(traffic.rampDurationSec, `${path}.rampDurationSec`, issues, {
      min: 0,
      max: 86_400,
    });
  if (traffic.spikeFrequencySec !== undefined)
    finiteNumber(traffic.spikeFrequencySec, `${path}.spikeFrequencySec`, issues, {
      min: 0,
      max: 86_400,
    });
  if (traffic.seed !== undefined)
    finiteNumber(traffic.seed, `${path}.seed`, issues, { min: 1, max: 0xffff_ffff });
  if (
    traffic.requestKeyDistribution !== undefined &&
    !ENUM_VALUES.requestKeyDistribution.has(traffic.requestKeyDistribution)
  )
    issues.push(`${path}.requestKeyDistribution is unsupported`);
  if (traffic.requestKeySpaceSize !== undefined)
    finiteNumber(traffic.requestKeySpaceSize, `${path}.requestKeySpaceSize`, issues, {
      min: 1,
      max: 1_000_000,
    });
  if (traffic.customSchedule !== undefined)
    validateStructuredValue(traffic.customSchedule, `${path}.customSchedule`, issues);
  if (traffic.customRequestKeys !== undefined)
    validateStructuredValue(traffic.customRequestKeys, `${path}.customRequestKeys`, issues);
  return true;
}

export function validateArchitectureState(
  input: unknown,
  options: { repairDanglingEdges?: boolean } = {},
): SerializedCanvasState {
  const issues: string[] = [];
  assertSafeUntrustedValue(input, {
    maxDepth: 8,
    maxEntries: 8_000,
    maxStringLength: ARCHITECTURE_LIMITS.maxTextLength,
  });
  if (!isPlainRecord(input)) throw new ArchitectureValidationError(['root must be an object']);
  if (!Array.isArray(input.nodes)) issues.push('nodes must be an array');
  if (!Array.isArray(input.edges)) issues.push('edges must be an array');
  if (issues.length) throw new ArchitectureValidationError(issues);
  try {
    assertAllowedKeys(input, ARCHITECTURE_ROOT_KEYS, 'root');
  } catch (error) {
    throw new ArchitectureValidationError([
      error instanceof Error ? error.message : 'root contains unexpected fields',
    ]);
  }
  const raw = structuredClone(input) as unknown as SerializedCanvasState;
  if (raw.nodes.length > ARCHITECTURE_LIMITS.maxNodes)
    issues.push(`nodes exceeds maximum ${ARCHITECTURE_LIMITS.maxNodes}`);
  if (raw.edges.length > ARCHITECTURE_LIMITS.maxEdges)
    issues.push(`edges exceeds maximum ${ARCHITECTURE_LIMITS.maxEdges}`);
  if ((raw.zones?.length || 0) > ARCHITECTURE_LIMITS.maxZones)
    issues.push(`zones exceeds maximum ${ARCHITECTURE_LIMITS.maxZones}`);

  const nodeIds = new Set<string>();
  raw.nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!isPlainRecord(node)) return issues.push(`${path} must be an object`);
    try {
      assertAllowedKeys(node, NODE_KEYS, path);
      if (isPlainRecord(node.position))
        assertAllowedKeys(node.position, POSITION_KEYS, `${path}.position`);
      if (isPlainRecord(node.data)) assertAllowedKeys(node.data, NODE_DATA_KEYS, `${path}.data`);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `${path} contains unexpected fields`);
    }
    if (validateId(node.id, `${path}.id`, issues)) {
      if (nodeIds.has(node.id)) issues.push(`${path}.id duplicates ${node.id}`);
      nodeIds.add(node.id);
    }
    finiteNumber(node.position?.x, `${path}.position.x`, issues, {
      min: -ARCHITECTURE_LIMITS.maxCoordinate,
      max: ARCHITECTURE_LIMITS.maxCoordinate,
    });
    finiteNumber(node.position?.y, `${path}.position.y`, issues, {
      min: -ARCHITECTURE_LIMITS.maxCoordinate,
      max: ARCHITECTURE_LIMITS.maxCoordinate,
    });
    const config = node.data?.config;
    if (!config || typeof config !== 'object')
      return issues.push(`${path}.data.config must be an object`);
    if (!COMPONENT_TYPES.has(config.type))
      return issues.push(`${path}.data.config.type is unsupported`);
    if (config.id !== node.id) issues.push(`${path}.data.config.id must match node id`);
    if (!CATEGORIES.has(config.category))
      issues.push(`${path}.data.config.category is unsupported`);
    if (COMPONENT_CATEGORIES.get(config.type) !== config.category)
      issues.push(`${path}.data.config.category does not match component type ${config.type}`);
    if (!HEALTH.has(config.health)) issues.push(`${path}.data.config.health is unsupported`);
    if (
      !boundedString(
        config.name,
        `${path}.data.config.name`,
        issues,
        ARCHITECTURE_LIMITS.maxNameLength,
      ) ||
      !config.name.trim()
    ) {
      issues.push(`${path}.data.config.name must not be blank`);
    }
    const defaults = createDefaultConfig(config.type, config.id, config.name);
    try {
      assertAllowedKeys(
        config as unknown as Record<string, unknown>,
        new Set(Object.keys(defaults)),
        `${path}.data.config`,
      );
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `${path}.data.config is invalid`);
    }
    validateStructuredValue(config, `${path}.data.config`, issues);
    for (const [key, template] of Object.entries(defaults)) {
      validateValueAgainstDefault(
        (config as unknown as Record<string, unknown>)[key],
        template,
        `${path}.data.config.${key}`,
        issues,
        key,
      );
    }
  });

  const edgeIds = new Set<string>();
  const validEdges = raw.edges.filter((edge, index) => {
    const path = `edges[${index}]`;
    if (!isPlainRecord(edge)) {
      issues.push(`${path} must be an object`);
      return false;
    }
    try {
      assertAllowedKeys(edge, EDGE_KEYS, path);
      if (isPlainRecord(edge.data)) assertAllowedKeys(edge.data, EDGE_DATA_KEYS, `${path}.data`);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `${path} contains unexpected fields`);
    }
    if (validateId(edge.id, `${path}.id`, issues)) {
      if (edgeIds.has(edge.id)) issues.push(`${path}.id duplicates ${edge.id}`);
      edgeIds.add(edge.id);
    }
    validateId(edge.source, `${path}.source`, issues);
    validateId(edge.target, `${path}.target`, issues);
    const dangling = !nodeIds.has(edge.source) || !nodeIds.has(edge.target);
    if (dangling && !options.repairDanglingEdges) issues.push(`${path} references a missing node`);
    if (!PROTOCOLS.has(edge.data?.protocol)) issues.push(`${path}.data.protocol is unsupported`);
    if (!EDGE_PURPOSES.includes(edge.data?.purpose || 'request'))
      issues.push(`${path}.data.purpose is unsupported`);
    if (edge.data?.latencyMs !== undefined)
      finiteNumber(edge.data.latencyMs, `${path}.data.latencyMs`, issues, {
        min: 0,
        max: 86_400_000,
      });
    if (edge.data?.bandwidthMbps !== undefined)
      finiteNumber(edge.data.bandwidthMbps, `${path}.data.bandwidthMbps`, issues, {
        min: 0,
        max: ARCHITECTURE_LIMITS.maxNumericValue,
      });
    return !dangling;
  });

  const zoneIds = new Set<string>();
  (raw.zones || []).forEach((zone, index) => {
    const path = `zones[${index}]`;
    if (!isPlainRecord(zone)) return issues.push(`${path} must be an object`);
    try {
      assertAllowedKeys(zone, ZONE_KEYS, path);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `${path} contains unexpected fields`);
    }
    if (validateId(zone.id, `${path}.id`, issues)) {
      if (zoneIds.has(zone.id)) issues.push(`${path}.id duplicates ${zone.id}`);
      zoneIds.add(zone.id);
    }
    if (
      !boundedString(zone.label, `${path}.label`, issues, ARCHITECTURE_LIMITS.maxNameLength) ||
      !zone.label.trim()
    )
      issues.push(`${path}.label must not be blank`);
    if (!ZONE_CATEGORIES.has(zone.category)) issues.push(`${path}.category is unsupported`);
    boundedString(zone.color, `${path}.color`, issues, ARCHITECTURE_LIMITS.maxNameLength);
    finiteNumber(zone.x, `${path}.x`, issues, {
      min: -ARCHITECTURE_LIMITS.maxCoordinate,
      max: ARCHITECTURE_LIMITS.maxCoordinate,
    });
    finiteNumber(zone.y, `${path}.y`, issues, {
      min: -ARCHITECTURE_LIMITS.maxCoordinate,
      max: ARCHITECTURE_LIMITS.maxCoordinate,
    });
    finiteNumber(zone.width, `${path}.width`, issues, {
      min: 1,
      max: ARCHITECTURE_LIMITS.maxCoordinate,
    });
    finiteNumber(zone.height, `${path}.height`, issues, {
      min: 1,
      max: ARCHITECTURE_LIMITS.maxCoordinate,
    });
  });
  if (raw.trafficConfig) validateTraffic(raw.trafficConfig, 'trafficConfig', issues);
  if (raw.appVersion !== undefined)
    boundedString(raw.appVersion, 'appVersion', issues, ARCHITECTURE_LIMITS.maxNameLength);
  if (raw.simulationMetadata !== undefined) {
    const metadata = raw.simulationMetadata;
    if (!isPlainRecord(metadata)) issues.push('simulationMetadata must be an object');
    else {
      try {
        assertAllowedKeys(metadata, SIMULATION_METADATA_KEYS, 'simulationMetadata');
      } catch (error) {
        issues.push(error instanceof Error ? error.message : 'simulationMetadata is invalid');
      }
      finiteNumber(metadata.savedAt, 'simulationMetadata.savedAt', issues, {
        min: 0,
        max: ARCHITECTURE_LIMITS.maxNumericValue * 10_000,
      });
      boundedString(
        metadata.appVersion,
        'simulationMetadata.appVersion',
        issues,
        ARCHITECTURE_LIMITS.maxNameLength,
      );
      if (
        typeof metadata.state !== 'string' ||
        !['idle', 'running', 'paused', 'stopped'].includes(metadata.state)
      )
        issues.push('simulationMetadata.state is unsupported');
    }
  }
  if (issues.length) throw new ArchitectureValidationError(issues);
  return {
    ...raw,
    version: ARCHITECTURE_SCHEMA_VERSION,
    appVersion: APPLICATION_VERSION,
    edges: options.repairDanglingEdges ? validEdges : raw.edges,
  };
}

export function formatArchitectureError(error: unknown): string {
  if (error instanceof ArchitectureValidationError)
    return `Invalid architecture: ${error.issues.slice(0, 5).join('; ')}`;
  return error instanceof Error ? error.message : 'Invalid architecture data';
}
