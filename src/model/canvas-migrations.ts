import { inferEdgePurpose, validateEdgePurpose } from './edge-semantics';
import { EdgeProtocol, SerializedCanvasState } from './types';
import { createDefaultConfig } from './component-defaults';

export const CURRENT_CANVAS_VERSION = 10 as const;

const MESSAGING_TYPES = new Set(['message_queue', 'task_queue', 'pubsub', 'event_bus']);
const COMPUTE_TYPES = new Set(['app_server', 'worker', 'serverless']);
const COMPLETED_MODEL_TYPES = new Set([
  'load_balancer',
  'api_gateway',
  'cdn',
  'dns',
  'firewall',
  'reverse_proxy',
  'sql_db',
  'nosql_db',
  'object_storage',
  'search_index',
  'graph_db',
  'timeseries_db',
  'rate_limiter',
  'auth_service',
  'encryption_service',
]);

/**
 * Upgrades saved architectures without mutating caller-owned input. Version 1
 * graphs had no edge purpose, so their purpose is inferred once at load time.
 */
export function migrateCanvasState(input: SerializedCanvasState): SerializedCanvasState {
  if (
    !input ||
    typeof input !== 'object' ||
    !Array.isArray(input.nodes) ||
    !Array.isArray(input.edges)
  ) {
    throw new Error('Architecture must contain node and edge arrays');
  }
  const sourceVersion = input.version || 1;
  if (sourceVersion < 1 || sourceVersion > CURRENT_CANVAS_VERSION) {
    throw new Error(`Unsupported architecture schema version ${sourceVersion}`);
  }
  const nodes = structuredClone(input.nodes || []).map((node) => {
    const config = node.data.config;
    const migratedConfig =
      !MESSAGING_TYPES.has(config.type) &&
      !COMPUTE_TYPES.has(config.type) &&
      !COMPLETED_MODEL_TYPES.has(config.type) &&
      config.type !== 'client'
        ? config
        : {
            ...createDefaultConfig(config.type, config.id, config.name),
            ...config,
          };
    return {
      id: node.id,
      type: node.type || 'customComponent',
      position: { x: node.position.x, y: node.position.y },
      data: { config: migratedConfig },
    };
  });
  const nodeTypes = new Map(nodes.map((node) => [node.id, node.data.config.type]));
  const edges = structuredClone(input.edges || []).map((edge) => {
    const protocol = (edge.data?.protocol || 'HTTP') as EdgeProtocol;
    const sourceType = nodeTypes.get(edge.source);
    const targetType = nodeTypes.get(edge.target);
    let purpose =
      edge.data?.purpose ||
      (sourceType && targetType ? inferEdgePurpose(sourceType, targetType, protocol) : 'request');
    if (
      sourceType &&
      targetType &&
      !validateEdgePurpose(sourceType, targetType, protocol, purpose).valid
    ) {
      purpose = inferEdgePurpose(sourceType, targetType, protocol);
    }
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: { ...edge.data, protocol, purpose },
    };
  });

  return {
    version: CURRENT_CANVAS_VERSION,
    appVersion: input.appVersion || '1.0.0',
    engineVersion: input.engineVersion,
    nodes,
    edges,
    zones: structuredClone(input.zones || []),
    trafficConfig: input.trafficConfig ? structuredClone(input.trafficConfig) : undefined,
    simulationMetadata: input.simulationMetadata
      ? structuredClone(input.simulationMetadata)
      : undefined,
  };
}
