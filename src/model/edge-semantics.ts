import { ComponentType, EdgeProtocol, EdgePurpose, ProtocolEdgeData } from './types';

const MESSAGE_COMPONENTS = new Set<ComponentType>([
  'message_queue',
  'task_queue',
  'pubsub',
  'event_bus',
]);

const FANOUT_COMPONENTS = new Set<ComponentType>(['pubsub', 'event_bus']);
const DATABASE_COMPONENTS = new Set<ComponentType>(['sql_db', 'nosql_db']);

export const EDGE_PURPOSES: EdgePurpose[] = [
  'request',
  'fallback',
  'async',
  'fanout',
  'replication',
  'observability',
];

const CACHE_COMPONENTS = new Set<ComponentType>([
  'redis_cache',
  'local_cache',
  'cdn_cache',
  'browser_cache',
  'cdn',
]);

const STATEFUL_COMPONENTS = new Set<ComponentType>([
  'sql_db',
  'nosql_db',
  'object_storage',
  'search_index',
  'graph_db',
  'timeseries_db',
  'redis_cache',
]);

const OBSERVABILITY_TARGETS = new Set<ComponentType>([
  'timeseries_db',
  'search_index',
  'message_queue',
  'event_bus',
]);

export interface EdgePurposeValidation {
  valid: boolean;
  reason?: string;
}

/** Rejects combinations whose execution semantics would be contradictory. */
export function validateEdgePurpose(
  sourceType: ComponentType,
  targetType: ComponentType,
  protocol: EdgeProtocol,
  purpose: EdgePurpose,
): EdgePurposeValidation {
  if (!EDGE_PURPOSES.includes(purpose)) {
    return { valid: false, reason: 'Unknown edge purpose.' };
  }

  if (purpose === 'request' && CACHE_COMPONENTS.has(sourceType)) {
    return {
      valid: false,
      reason: 'Cache origin paths must use fallback so hits terminate before origin access.',
    };
  }

  if (
    purpose === 'async' &&
    !(
      MESSAGE_COMPONENTS.has(sourceType) ||
      MESSAGE_COMPONENTS.has(targetType) ||
      protocol === 'pub/sub' ||
      protocol === 'MQTT'
    )
  ) {
    return {
      valid: false,
      reason: 'Async edges require a messaging endpoint or pub/sub transport.',
    };
  }

  if (
    purpose === 'fanout' &&
    !(
      FANOUT_COMPONENTS.has(sourceType) ||
      sourceType === 'app_server' ||
      sourceType === 'api_gateway'
    )
  ) {
    return {
      valid: false,
      reason: 'Fanout must originate from pub/sub, an event bus, app server, or API gateway.',
    };
  }

  if (
    purpose === 'fallback' &&
    !(
      CACHE_COMPONENTS.has(sourceType) ||
      sourceType === 'app_server' ||
      sourceType === 'serverless' ||
      sourceType === 'api_gateway' ||
      sourceType === 'reverse_proxy'
    )
  ) {
    return {
      valid: false,
      reason: 'Fallback must originate from a cache or request-processing component.',
    };
  }

  if (
    purpose === 'replication' &&
    !(STATEFUL_COMPONENTS.has(sourceType) && STATEFUL_COMPONENTS.has(targetType))
  ) {
    return {
      valid: false,
      reason: 'Replication edges require stateful storage or cache endpoints.',
    };
  }

  if (purpose === 'observability' && !OBSERVABILITY_TARGETS.has(targetType)) {
    return {
      valid: false,
      reason: 'Observability edges must target telemetry-capable storage or messaging.',
    };
  }

  return { valid: true };
}

/**
 * Selects the initial purpose for a newly drawn edge. The stored purpose remains
 * authoritative and can be changed independently of this suggestion.
 */
export function inferEdgePurpose(
  sourceType: ComponentType,
  targetType: ComponentType,
  protocol: EdgeProtocol,
): EdgePurpose {
  if (CACHE_COMPONENTS.has(sourceType)) {
    return 'fallback';
  }

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
