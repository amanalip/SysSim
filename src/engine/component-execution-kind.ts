import type { ComponentType } from '../model/types';
import { assertNever } from '../utils/assert-never';

export type ComponentExecutionKind =
  'origin' | 'compute' | 'routing' | 'cache' | 'storage' | 'messaging' | 'security';

/** Exhaustive dispatch guard used before component models are initialized. */
export function getComponentExecutionKind(type: ComponentType): ComponentExecutionKind {
  switch (type) {
    case 'client':
      return 'origin';
    case 'app_server':
    case 'worker':
    case 'serverless':
      return 'compute';
    case 'load_balancer':
    case 'api_gateway':
    case 'dns':
    case 'firewall':
    case 'reverse_proxy':
      return 'routing';
    case 'cdn':
    case 'redis_cache':
    case 'local_cache':
    case 'cdn_cache':
    case 'browser_cache':
      return 'cache';
    case 'sql_db':
    case 'nosql_db':
    case 'object_storage':
    case 'search_index':
    case 'graph_db':
    case 'timeseries_db':
      return 'storage';
    case 'message_queue':
    case 'pubsub':
    case 'event_bus':
    case 'task_queue':
      return 'messaging';
    case 'rate_limiter':
    case 'auth_service':
    case 'encryption_service':
      return 'security';
    default:
      return assertNever(type, 'component type');
  }
}
