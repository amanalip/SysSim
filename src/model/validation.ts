import { ComponentType, EdgeProtocol } from './types';

export interface ConnectionRule {
  allowedTargets: ComponentType[];
  defaultProtocol: EdgeProtocol;
  description: string;
}

export const CONNECTION_RULES: Record<ComponentType, ConnectionRule> = {
  client: {
    allowedTargets: [
      'load_balancer',
      'api_gateway',
      'cdn',
      'dns',
      'firewall',
      'reverse_proxy',
      'rate_limiter',
      'app_server',
      'browser_cache',
    ],
    defaultProtocol: 'HTTP',
    description:
      'Clients typically connect to edge gateways, DNS, load balancers, CDNs, or firewalls.',
  },
  dns: {
    allowedTargets: ['cdn', 'load_balancer', 'api_gateway', 'reverse_proxy', 'firewall', 'client'],
    defaultProtocol: 'TCP',
    description: 'DNS resolves traffic to CDNs, load balancers, or gateways.',
  },
  firewall: {
    allowedTargets: [
      'load_balancer',
      'api_gateway',
      'reverse_proxy',
      'cdn',
      'rate_limiter',
      'app_server',
    ],
    defaultProtocol: 'HTTP',
    description: 'Firewalls forward filtered traffic to load balancers, API gateways, or proxies.',
  },
  rate_limiter: {
    allowedTargets: ['api_gateway', 'load_balancer', 'app_server', 'serverless', 'reverse_proxy'],
    defaultProtocol: 'HTTP',
    description: 'Rate limiters sit before API gateways or backend servers.',
  },
  cdn: {
    allowedTargets: [
      'load_balancer',
      'api_gateway',
      'object_storage',
      'reverse_proxy',
      'app_server',
      'cdn_cache',
    ],
    defaultProtocol: 'HTTP',
    description: 'CDNs route cache misses to origin servers or object storage.',
  },
  cdn_cache: {
    allowedTargets: ['load_balancer', 'api_gateway', 'object_storage', 'app_server'],
    defaultProtocol: 'HTTP',
    description: 'CDN edge caches forward cache misses to origin services.',
  },
  browser_cache: {
    allowedTargets: ['cdn', 'dns', 'load_balancer', 'api_gateway', 'reverse_proxy'],
    defaultProtocol: 'HTTP',
    description: 'Browser caches forward cache misses across the network.',
  },
  reverse_proxy: {
    allowedTargets: ['load_balancer', 'app_server', 'api_gateway', 'redis_cache', 'local_cache'],
    defaultProtocol: 'HTTP',
    description: 'Reverse proxies buffer and route requests to downstream services.',
  },
  api_gateway: {
    allowedTargets: [
      'load_balancer',
      'app_server',
      'serverless',
      'auth_service',
      'rate_limiter',
      'message_queue',
      'pubsub',
      'event_bus',
    ],
    defaultProtocol: 'HTTP',
    description: 'API gateways route traffic to microservices, serverless functions, or queues.',
  },
  load_balancer: {
    allowedTargets: ['app_server', 'worker', 'serverless', 'api_gateway', 'reverse_proxy'],
    defaultProtocol: 'HTTP',
    description: 'Load balancers distribute traffic across application servers.',
  },
  app_server: {
    allowedTargets: [
      'sql_db',
      'nosql_db',
      'redis_cache',
      'local_cache',
      'message_queue',
      'pubsub',
      'event_bus',
      'task_queue',
      'search_index',
      'graph_db',
      'timeseries_db',
      'object_storage',
      'auth_service',
      'encryption_service',
      'app_server',
      'worker',
      'serverless',
    ],
    defaultProtocol: 'gRPC',
    description: 'Application servers coordinate with databases, caches, queues, and services.',
  },
  worker: {
    allowedTargets: [
      'sql_db',
      'nosql_db',
      'redis_cache',
      'search_index',
      'object_storage',
      'timeseries_db',
      'message_queue',
      'task_queue',
      'encryption_service',
    ],
    defaultProtocol: 'TCP',
    description: 'Workers process tasks and persist state to databases or object stores.',
  },
  serverless: {
    allowedTargets: [
      'sql_db',
      'nosql_db',
      'redis_cache',
      'object_storage',
      'message_queue',
      'pubsub',
      'task_queue',
      'search_index',
      'timeseries_db',
    ],
    defaultProtocol: 'HTTP',
    description: 'Serverless functions interact with managed persistence and queues.',
  },
  redis_cache: {
    allowedTargets: ['sql_db', 'nosql_db', 'timeseries_db'],
    defaultProtocol: 'TCP',
    description: 'Cache look-aside pattern queries persistence tier on miss.',
  },
  local_cache: {
    allowedTargets: ['redis_cache', 'sql_db', 'nosql_db'],
    defaultProtocol: 'TCP',
    description: 'Local cache falls back to remote cache or database.',
  },
  sql_db: {
    allowedTargets: ['object_storage', 'timeseries_db'],
    defaultProtocol: 'TCP',
    description: 'Databases may export WAL or backups to object storage.',
  },
  nosql_db: {
    allowedTargets: ['search_index', 'object_storage'],
    defaultProtocol: 'TCP',
    description: 'NoSQL databases can stream change logs to search indexes or storage.',
  },
  object_storage: {
    allowedTargets: ['cdn', 'worker'],
    defaultProtocol: 'HTTP',
    description: 'Object storage sends assets to CDNs or triggers async worker jobs.',
  },
  search_index: {
    allowedTargets: ['object_storage'],
    defaultProtocol: 'HTTP',
    description: 'Search indexes snapshot indexes to object storage.',
  },
  graph_db: {
    allowedTargets: ['object_storage'],
    defaultProtocol: 'TCP',
    description: 'Graph databases back up snapshots to object storage.',
  },
  timeseries_db: {
    allowedTargets: ['object_storage'],
    defaultProtocol: 'TCP',
    description: 'Time-series databases cold-tier older metrics to object storage.',
  },
  message_queue: {
    allowedTargets: ['worker', 'app_server', 'serverless', 'timeseries_db'],
    defaultProtocol: 'pub/sub',
    description: 'Message queues stream events to consumers and workers.',
  },
  pubsub: {
    allowedTargets: ['worker', 'app_server', 'serverless', 'message_queue', 'timeseries_db'],
    defaultProtocol: 'pub/sub',
    description: 'Pub/sub brokers broadcast topics to subscribers and workers.',
  },
  event_bus: {
    allowedTargets: ['worker', 'app_server', 'serverless', 'message_queue', 'task_queue'],
    defaultProtocol: 'pub/sub',
    description: 'Event buses route domain events to services.',
  },
  task_queue: {
    allowedTargets: ['worker', 'serverless', 'app_server'],
    defaultProtocol: 'pub/sub',
    description: 'Task queues dispatch work units to workers.',
  },
  auth_service: {
    allowedTargets: ['redis_cache', 'sql_db', 'nosql_db', 'encryption_service'],
    defaultProtocol: 'TCP',
    description: 'Auth services look up credentials and tokens in cache or DB.',
  },
  encryption_service: {
    allowedTargets: ['object_storage'],
    defaultProtocol: 'TCP',
    description: 'KMS services manage root keys and backup stores.',
  },
};

export interface ValidationResult {
  valid: boolean;
  recommendedProtocol: EdgeProtocol;
  message?: string;
}

export function validateConnection(
  sourceType: ComponentType,
  targetType: ComponentType,
): ValidationResult {
  const rule = CONNECTION_RULES[sourceType];
  if (!rule) {
    return {
      valid: true,
      recommendedProtocol: 'HTTP',
    };
  }

  const isAllowed = rule.allowedTargets.includes(targetType);
  if (!isAllowed) {
    return {
      valid: false,
      recommendedProtocol: rule.defaultProtocol,
      message: `Direct connection from ${sourceType.replace('_', ' ')} to ${targetType.replace('_', ' ')} is not recommended. ${rule.description}`,
    };
  }

  return {
    valid: true,
    recommendedProtocol: rule.defaultProtocol,
  };
}
