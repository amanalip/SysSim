import { inferEdgePurpose, validateEdgePurpose } from './edge-semantics';
import { EdgeProtocol, SerializedCanvasState } from './types';
import { createDefaultConfig } from './component-defaults';

export const CURRENT_CANVAS_VERSION = 7 as const;

const MESSAGING_TYPES = new Set(['message_queue', 'task_queue', 'pubsub', 'event_bus']);
const COMPUTE_TYPES = new Set(['app_server', 'worker', 'serverless']);
const NETWORK_COMPLETION_TYPES = new Set([
  'load_balancer', 'api_gateway', 'cdn', 'dns', 'firewall', 'reverse_proxy', 'sql_db',
]);

/**
 * Upgrades saved architectures without mutating caller-owned input. Version 1
 * graphs had no edge purpose, so their purpose is inferred once at load time.
 */
export function migrateCanvasState(input: SerializedCanvasState): SerializedCanvasState {
  const nodes = structuredClone(input.nodes || []).map((node) => {
    const config = node.data.config;
    if (
      !MESSAGING_TYPES.has(config.type) &&
      !COMPUTE_TYPES.has(config.type) &&
      !NETWORK_COMPLETION_TYPES.has(config.type) &&
      config.type !== 'client'
    ) return node;
    return {
      ...node,
      data: {
        ...node.data,
        config: {
          ...createDefaultConfig(config.type, config.id, config.name),
          ...config,
        },
      },
    };
  });
  const nodeTypes = new Map(nodes.map((node) => [node.id, node.data.config.type]));
  const edges = structuredClone(input.edges || []).map((edge) => {
    const protocol = (edge.data?.protocol || 'HTTP') as EdgeProtocol;
    const sourceType = nodeTypes.get(edge.source);
    const targetType = nodeTypes.get(edge.target);
    let purpose = edge.data?.purpose || (
      sourceType && targetType
        ? inferEdgePurpose(sourceType, targetType, protocol)
        : 'request'
    );
    if (
      sourceType &&
      targetType &&
      !validateEdgePurpose(sourceType, targetType, protocol, purpose).valid
    ) {
      purpose = inferEdgePurpose(sourceType, targetType, protocol);
    }
    return {
      ...edge,
      data: { ...edge.data, protocol, purpose },
    };
  });

  return {
    version: CURRENT_CANVAS_VERSION,
    nodes,
    edges,
    zones: structuredClone(input.zones || []),
  };
}
