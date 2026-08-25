export type ComponentCategory =
  | 'compute'
  | 'networking'
  | 'storage'
  | 'caching'
  | 'messaging'
  | 'security';

export type ComponentType =
  // Compute
  | 'client'
  | 'app_server'
  | 'worker'
  | 'serverless'
  // Networking
  | 'load_balancer'
  | 'api_gateway'
  | 'cdn'
  | 'dns'
  | 'firewall'
  | 'reverse_proxy'
  // Storage
  | 'sql_db'
  | 'nosql_db'
  | 'object_storage'
  | 'search_index'
  | 'graph_db'
  | 'timeseries_db'
  // Caching
  | 'redis_cache'
  | 'local_cache'
  | 'cdn_cache'
  | 'browser_cache'
  // Messaging
  | 'message_queue'
  | 'pubsub'
  | 'event_bus'
  | 'task_queue'
  // Security
  | 'rate_limiter'
  | 'auth_service'
  | 'encryption_service';

export type NodeHealthStatus = 'healthy' | 'degraded' | 'down' | 'overloaded';

export type EdgeProtocol = 'HTTP' | 'gRPC' | 'WebSocket' | 'TCP' | 'pub/sub' | 'MQTT';

export type LoadBalancerAlgorithm =
  | 'round_robin'
  | 'least_connections'
  | 'consistent_hashing'
  | 'weighted'
  | 'ip_hash';

export type RateLimiterAlgorithm =
  | 'token_bucket'
  | 'sliding_window'
  | 'fixed_window'
  | 'leaky_bucket';

export type CacheEvictionPolicy = 'LRU' | 'LFU' | 'TTL' | 'FIFO';

export interface BaseComponentConfig {
  id: string;
  name: string;
  type: ComponentType;
  category: ComponentCategory;
  health: NodeHealthStatus;
  customLatencyMs?: number;
  failureRatePercent?: number;
  maxThroughputQps?: number;
  zoneId?: string;
}

export interface ClientConfig extends BaseComponentConfig {
  type: 'client';
  requestRateQps: number;
  connectionType: 'HTTP/2' | 'HTTP/3' | 'WebSocket';
}

export interface AppServerConfig extends BaseComponentConfig {
  type: 'app_server';
  replicas: number;
  maxConnections: number;
  processingLatencyMs: number;
  failureRatePercent: number;
  cpuUtilizationPercent?: number;
}

export interface WorkerConfig extends BaseComponentConfig {
  type: 'worker';
  replicas: number;
  jobProcessingRatePerSec: number;
  retryLimit: number;
  concurrencyLimit: number;
}

export interface ServerlessConfig extends BaseComponentConfig {
  type: 'serverless';
  coldStartLatencyMs: number;
  concurrencyLimit: number;
  timeoutMs: number;
  memoryMb: number;
}

export interface LoadBalancerConfig extends BaseComponentConfig {
  type: 'load_balancer';
  algorithm: LoadBalancerAlgorithm;
  healthCheckIntervalSec: number;
  stickySession: boolean;
}

export interface ApiGatewayConfig extends BaseComponentConfig {
  type: 'api_gateway';
  rateLimitQps: number;
  authMode: 'JWT' | 'API_Key' | 'OAuth2' | 'None';
  timeoutMs: number;
  circuitBreakerEnabled: boolean;
}

export interface CDNConfig extends BaseComponentConfig {
  type: 'cdn';
  cacheTtlSec: number;
  edgeLocationsCount: number;
  originShielding: boolean;
  hitRatioPercent: number;
}

export interface DNSConfig extends BaseComponentConfig {
  type: 'dns';
  ttlSec: number;
  routingPolicy: 'simple' | 'weighted' | 'geolocation' | 'latency_based';
}

export interface FirewallConfig extends BaseComponentConfig {
  type: 'firewall';
  ruleCount: number;
  inspectionLatencyMs: number;
  blockRatePercent: number;
}

export interface ReverseProxyConfig extends BaseComponentConfig {
  type: 'reverse_proxy';
  enableCompression: boolean;
  cacheRules: string;
  maxConnections: number;
}

export interface SqlDbConfig extends BaseComponentConfig {
  type: 'sql_db';
  replicas: number;
  readReplicasCount: number;
  baseLatencyMs: number;
  maxConnections: number;
  shardingKey?: string;
  isolationLevel: 'Read Committed' | 'Repeatable Read' | 'Serializable';
}

export interface NoSqlDbConfig extends BaseComponentConfig {
  type: 'nosql_db';
  partitionKey: string;
  consistencyLevel: 'eventual' | 'strong' | 'session' | 'bounded_staleness';
  replicas: number;
  baseLatencyMs: number;
  replicationLagMs: number;
}

export interface ObjectStorageConfig extends BaseComponentConfig {
  type: 'object_storage';
  latencyMs: number;
  throughputMbPerSec: number;
  storageClass: 'Standard' | 'Infrequent' | 'Glacier';
}

export interface SearchIndexConfig extends BaseComponentConfig {
  type: 'search_index';
  shards: number;
  replicas: number;
  indexingLatencyMs: number;
  queryLatencyMs: number;
}

export interface GraphDbConfig extends BaseComponentConfig {
  type: 'graph_db';
  queryLatencyMs: number;
  traversalDepthLimit: number;
}

export interface TimeSeriesDbConfig extends BaseComponentConfig {
  type: 'timeseries_db';
  writeThroughputPerSec: number;
  retentionDays: number;
  queryLatencyMs: number;
}

export interface RedisCacheConfig extends BaseComponentConfig {
  type: 'redis_cache';
  sizeMb: number;
  evictionPolicy: CacheEvictionPolicy;
  hitRatioPercent: number;
  replicas: number;
  readLatencyMs: number;
}

export interface LocalCacheConfig extends BaseComponentConfig {
  type: 'local_cache';
  sizeMb: number;
  ttlSec: number;
  hitRatioPercent: number;
}

export interface CdnCacheConfig extends BaseComponentConfig {
  type: 'cdn_cache';
  ttlSec: number;
  hitRatioPercent: number;
}

export interface BrowserCacheConfig extends BaseComponentConfig {
  type: 'browser_cache';
  ttlSec: number;
  hitRatioPercent: number;
}

export interface MessageQueueConfig extends BaseComponentConfig {
  type: 'message_queue';
  partitions: number;
  consumerGroups: number;
  maxDepth: number;
  orderingGuarantee: 'FIFO' | 'Partition Key' | 'None';
  retentionHours: number;
  consumerThroughputPerSec: number;
}

export interface PubSubConfig extends BaseComponentConfig {
  type: 'pubsub';
  topicCount: number;
  subscribersPerTopic: number;
  deliveryGuarantee: 'at_most_once' | 'at_least_once' | 'exactly_once';
}

export interface EventBusConfig extends BaseComponentConfig {
  type: 'event_bus';
  throughputPerSec: number;
  fanoutFactor: number;
}

export interface TaskQueueConfig extends BaseComponentConfig {
  type: 'task_queue';
  priorityLevels: number;
  retryLimit: number;
  deadLetterQueue: boolean;
}

export interface RateLimiterConfig extends BaseComponentConfig {
  type: 'rate_limiter';
  algorithm: RateLimiterAlgorithm;
  limitQps: number;
  windowSizeSec: number;
}

export interface AuthServiceConfig extends BaseComponentConfig {
  type: 'auth_service';
  tokenType: 'JWT' | 'Session' | 'Paseto';
  ttlMinutes: number;
  validationLatencyMs: number;
}

export interface EncryptionServiceConfig extends BaseComponentConfig {
  type: 'encryption_service';
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'RSA-4096';
  keyRotationDays: number;
  overheadLatencyMs: number;
}

export type AnyComponentConfig =
  | ClientConfig
  | AppServerConfig
  | WorkerConfig
  | ServerlessConfig
  | LoadBalancerConfig
  | ApiGatewayConfig
  | CDNConfig
  | DNSConfig
  | FirewallConfig
  | ReverseProxyConfig
  | SqlDbConfig
  | NoSqlDbConfig
  | ObjectStorageConfig
  | SearchIndexConfig
  | GraphDbConfig
  | TimeSeriesDbConfig
  | RedisCacheConfig
  | LocalCacheConfig
  | CdnCacheConfig
  | BrowserCacheConfig
  | MessageQueueConfig
  | PubSubConfig
  | EventBusConfig
  | TaskQueueConfig
  | RateLimiterConfig
  | AuthServiceConfig
  | EncryptionServiceConfig;

export interface ZoneData {
  id: string;
  label: string;
  category: 'public' | 'private' | 'data' | 'edge';
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProtocolEdgeData {
  protocol: EdgeProtocol;
  bandwidthMbps?: number;
  latencyMs?: number;
  isCut?: boolean;
}

export type TrafficPattern = 'steady' | 'bursty' | 'ramp' | 'spike' | 'custom';

export interface TrafficConfig {
  pattern: TrafficPattern;
  baseQps: number;
  burstMultiplier: number;
  rampDurationSec: number;
  spikeFrequencySec: number;
  customSchedule?: Array<{ timeSec: number; qps: number }>;
}

export type SimulationState = 'idle' | 'running' | 'paused' | 'stopped';

export interface RequestHop {
  nodeId: string;
  nodeName: string;
  nodeType: ComponentType;
  enterTimeMs: number;
  exitTimeMs: number;
  latencyMs: number;
  status: 'hit' | 'miss' | 'processed' | 'rejected' | 'queued' | 'error';
  info?: string;
}

export interface SimRequest {
  id: string;
  timestamp: number;
  sourceNodeId: string;
  currentEdgeId?: string;
  currentEdgeProgress?: number; // 0 to 1
  path: RequestHop[];
  totalLatencyMs: number;
  status: 'in_flight' | 'success' | 'rate_limited' | 'timeout' | 'error' | 'dropped';
  color: string;
}

export interface ComponentMetricSnapshot {
  nodeId: string;
  nodeName: string;
  nodeType: ComponentType;
  qps: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRatePercent: number;
  activeConnections: number;
  queueDepth: number;
  cacheHitRatioPercent: number;
  utilizationPercent: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface TimeSeriesDataPoint {
  timestampSec: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputQps: number;
  errorRatePercent: number;
  cacheHitRatioPercent: number;
  activeRequests: number;
}

export interface OverallMetrics {
  totalRequestsSent: number;
  totalRequestsSuccess: number;
  totalRequestsFailed: number;
  currentQps: number;
  avgEndToEndLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  overallErrorRatePercent: number;
  overallCacheHitRatioPercent: number;
  busiestNodeId?: string;
  slowestNodeId?: string;
  timeSeries: TimeSeriesDataPoint[];
  componentMetrics: Record<string, ComponentMetricSnapshot>;
}

export type BottleneckSeverity = 'warning' | 'critical';

export type BottleneckType =
  | 'spof'
  | 'capacity_overload'
  | 'hot_partition'
  | 'missing_cache'
  | 'synchronous_chain'
  | 'unbalanced_load'
  | 'queue_overflow';

export interface BottleneckIssue {
  id: string;
  type: BottleneckType;
  severity: BottleneckSeverity;
  nodeId: string;
  nodeName: string;
  title: string;
  description: string;
  suggestedFix: string;
  metricValue?: string;
}

export interface ScenarioHint {
  step: number;
  hint: string;
}

export interface ScenarioReferenceSource {
  title: string;
  authorOrOrg: string;
  url?: string;
  note?: string;
}

export interface ScenarioDiscussionPoint {
  question: string;
  answer: string;
}

export interface ScenarioConstraints {
  targetQps: number;
  dataSizeGb: number;
  maxP99LatencyMs: number;
  availabilitySlaPercent: number;
}

export interface SerializedCanvasState {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
      config: AnyComponentConfig;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    data: ProtocolEdgeData;
  }>;
  zones?: ZoneData[];
}

export interface Scenario {
  id: number;
  slug: string;
  title: string;
  category:
    | 'Core / Classic'
    | 'Social & Messaging'
    | 'Streaming & Media'
    | 'E-Commerce & Payments'
    | 'Search & Discovery'
    | 'Infrastructure & Platform'
    | 'Data & Analytics'
    | 'Auth & Security'
    | 'IoT & Edge Computing'
    | 'Gaming'
    | 'ML / AI Infrastructure'
    | 'Collaboration & Productivity'
    | 'Maps & Geolocation'
    | 'Communication'
    | 'Content & Publishing';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problemStatement: string;
  constraints: ScenarioConstraints;
  hints: ScenarioHint[];
  referenceDesign: SerializedCanvasState;
  discussionPoints: ScenarioDiscussionPoint[];
  sources: ScenarioReferenceSource[];
  trafficPreset: TrafficConfig;
}

export interface CalculatorInputs {
  qps: number;
  payloadSizeKb: number;
  retentionDays: number;
  readWriteRatio: number; // e.g. 10 for 10:1 read to write
  replicationFactor: number;
  slaAvailabilityPercent: number;
  serverCapacityQps: number;
}

export interface CalculatorOutputs {
  dailyNewDataGb: number;
  totalStorageNeededTb: number;
  totalReplicatedStorageTb: number;
  inboundBandwidthMbps: number;
  outboundBandwidthMbps: number;
  estimatedServersNeeded: number;
  recommendedCacheMemoryGb: number;
  estimatedDbConnections: number;
  formulas: Record<string, string>;
}
