import { ComponentType, EdgeProtocol, EdgePurpose, ProtocolEdgeData } from './types';

const MESSAGE_COMPONENTS = new Set<ComponentType>([
  'message_queue',
  'task_queue',
  'pubsub',
  'event_bus',
]);

const FANOUT_COMPONENTS = new Set<ComponentType>(['pubsub', 'event_bus']);
const DATABASE_COMPONENTS = new Set<ComponentType>(['sql_db', 'nosql_db']);

/**
 * Selects the initial purpose for a newly drawn edge. The stored purpose remains
 * authoritative and can be changed independently of this suggestion.
 */
export function inferEdgePurpose(
  sourceType: ComponentType,
  targetType: ComponentType,
  protocol: EdgeProtocol,
): EdgePurpose {
  if (DATABASE_COMPONENTS.has(sourceType) && DATABASE_COMPONENTS.has(targetType)) {
    return 'replication';
  }

  if (FANOUT_COMPONENTS.has(sourceType)) {
    return 'fanout';
  }

  if (
    MESSAGE_COMPONENTS.has(sourceType) ||
    MESSAGE_COMPONENTS.has(targetType) ||
    protocol === 'pub/sub' ||
    protocol === 'MQTT'
  ) {
    return 'async';
  }

  return 'request';
}

/** Legacy edges remain synchronous until the explicit migration task is completed. */
export function getEdgePurpose(data: ProtocolEdgeData | undefined): EdgePurpose {
  return data?.purpose || 'request';
}
