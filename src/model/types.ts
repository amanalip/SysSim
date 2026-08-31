export type ComponentCategory =
  'compute' | 'networking' | 'storage' | 'caching' | 'messaging' | 'security';

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

export type EdgeProtocol = 'HTTP' | 'gRPC' | 'WebSocket' | 'TCP' | 'UDP' | 'pub/sub' | 'MQTT';

export type EdgePurpose =
  'request' | 'fallback' | 'async' | 'fanout' | 'replication' | 'observability';

export type LoadBalancerAlgorithm =
  'round_robin' | 'least_connections' | 'consistent_hashing' | 'weighted' | 'ip_hash';

export type RateLimiterAlgorithm =
  'token_bucket' | 'sliding_window' | 'fixed_window' | 'leaky_bucket';

export type CacheEvictionPolicy = 'LRU' | 'LFU' | 'TTL' | 'FIFO';

export type RequestKeyDistribution = 'uniform' | 'zipfian' | 'custom';
export type ClientOperationType = 'read' | 'write' | 'mixed';
export type DeliveryGuarantee = 'at_most_once' | 'at_least_once' | 'exactly_once';
export type MessageOrdering = 'FIFO' | 'Partition Key' | 'None';
export type QueueOverflowPolicy = 'reject_newest' | 'drop_oldest';

export interface CustomRequestKey {
  key: string;
  weight: number;
}

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
  latencyDistribution?: 'fixed' | 'uniform' | 'normal' | 'lognormal';
  latencyJitterPercent?: number;
}

export interface ClientConfig extends BaseComponentConfig {
  type: 'client';
  requestRateQps: number;
  connectionType: 'HTTP/2' | 'HTTP/3' | 'WebSocket';
  requestPayloadKb: number;
  operationType: ClientOperationType;
  readPercentage: number;
  requestKeyDistribution: RequestKeyDistribution;
  requestKeySpaceSize: number;
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
  processingLatencyMs: number;
}

export interface ServerlessConfig extends BaseComponentConfig {
  type: 'serverless';
  coldStartLatencyMs: number;
  concurrencyLimit: number;
  timeoutMs: number;
  memoryMb: number;
  baseExecutionLatencyMs: number;
  warmInstances: number;
  idleTimeoutSec: number;
}

export interface LoadBalancerConfig extends BaseComponentConfig {
  type: 'load_balancer';
  algorithm: LoadBalancerAlgorithm;
  healthCheckIntervalSec: number;
  healthRecoveryDelaySec: number;
  stickySession: boolean;
  targetWeights: Record<string, number>;
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
  lookupLatencyMs: number;
  routingPolicy: 'simple' | 'weighted' | 'geolocation' | 'latency_based';
  targetWeights: Record<string, number>;
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
  bufferingEnabled: boolean;
  bufferSizeKb: number;
  upstreamBandwidthMbps: number;
}

export interface SqlDbConfig extends BaseComponentConfig {
  type: 'sql_db';
  replicas: number;
  readReplicasCount: number;
  baseLatencyMs: number;
  maxConnections: number;
  connectionQueueLimit: number;
  shardingKey?: string;
  shardCount: number;
  isolationLevel: 'Read Committed' | 'Repeatable Read' | 'Serializable';
  replicationLagMs: number;
  automaticFailover: boolean;
  failoverLatencyMs: number;
}

export interface NoSqlDbConfig extends BaseComponentConfig {
  type: 'nosql_db';
  partitionKey: string;
  consistencyLevel: 'eventual' | 'strong' | 'session' | 'bounded_staleness';
  replicas: number;
  partitionCount: number;
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
  traversalDepth: number;
}

export interface TimeSeriesDbConfig extends BaseComponentConfig {
  type: 'timeseries_db';
  writeThroughputPerSec: number;
  retentionDays: number;
  queryLatencyMs: number;
  coldTierEnabled: boolean;
  coldTierAfterDays: number;
  coldTierLatencyMultiplier: number;
}

export interface RedisCacheConfig extends BaseComponentConfig {
  type: 'redis_cache';
  sizeMb: number;
  evictionPolicy: CacheEvictionPolicy;
  hitRatioPercent: number;
  replicas: number;
  readLatencyMs: number;
  ttlSec: number;
  entrySizeKb: number;
  requestCoalescingEnabled: boolean;
}

export interface LocalCacheConfig extends BaseComponentConfig {
  type: 'local_cache';
  sizeMb: number;
  ttlSec: number;
  hitRatioPercent: number;
  evictionPolicy: CacheEvictionPolicy;
  readLatencyMs: number;
  entrySizeKb: number;
  requestCoalescingEnabled: boolean;
}

export interface CdnCacheConfig extends BaseComponentConfig {
  type: 'cdn_cache';
  ttlSec: number;
  hitRatioPercent: number;
  readLatencyMs: number;
  requestCoalescingEnabled: boolean;
}

export interface BrowserCacheConfig extends BaseComponentConfig {
  type: 'browser_cache';
  ttlSec: number;
  hitRatioPercent: number;
  readLatencyMs: number;
  requestCoalescingEnabled: boolean;
}

export interface MessageQueueConfig extends BaseComponentConfig {
  type: 'message_queue';
  partitions: number;
  consumerGroups: number;
  maxDepth: number;
  orderingGuarantee: MessageOrdering;
  retentionHours: number;
  overflowPolicy: QueueOverflowPolicy;
  consumerThroughputPerSec: number;
  producerAckLatencyMs: number;
  consumerProcessingLatencyMs: number;
  deliveryGuarantee: DeliveryGuarantee;
  retryLimit: number;
  retryDelayMs: number;
  deadLetterQueue: boolean;
}

export interface PubSubConfig extends BaseComponentConfig {
  type: 'pubsub';
  topicCount: number;
  subscribersPerTopic: number;
  deliveryGuarantee: DeliveryGuarantee;
  maxDepth: number;
  retentionHours: number;
  overflowPolicy: QueueOverflowPolicy;
  consumerThroughputPerSec: number;
  producerAckLatencyMs: number;
  consumerProcessingLatencyMs: number;
  retryLimit: number;
  retryDelayMs: number;
  deadLetterQueue: boolean;
  orderingGuarantee: MessageOrdering;
}

export interface EventBusConfig extends BaseComponentConfig {
  type: 'event_bus';
  throughputPerSec: number;
  fanoutFactor: number;
  maxDepth: number;
  retentionHours: number;
  overflowPolicy: QueueOverflowPolicy;
  producerAckLatencyMs: number;
  consumerProcessingLatencyMs: number;
  deliveryGuarantee: DeliveryGuarantee;
  retryLimit: number;
  retryDelayMs: number;
  deadLetterQueue: boolean;
  orderingGuarantee: MessageOrdering;
}

export interface TaskQueueConfig extends BaseComponentConfig {
  type: 'task_queue';
  priorityLevels: number;
  retryLimit: number;
  deadLetterQueue: boolean;
  maxDepth: number;
  retentionHours: number;
  overflowPolicy: QueueOverflowPolicy;
  consumerThroughputPerSec: number;
  producerAckLatencyMs: number;
  consumerProcessingLatencyMs: number;
  deliveryGuarantee: DeliveryGuarantee;
  retryDelayMs: number;
  orderingGuarantee: MessageOrdering;
}

export interface RateLimiterConfig extends BaseComponentConfig {
  type: 'rate_limiter';
  algorithm: RateLimiterAlgorithm;
  limitQps: number;
  windowSizeSec: number;
  burstCapacity: number;
  decisionLatencyMs: number;
}

export interface AuthServiceConfig extends BaseComponentConfig {
  type: 'auth_service';
  tokenType: 'JWT' | 'Session' | 'Paseto';
  ttlMinutes: number;
  validationLatencyMs: number;
  sessionCacheEnabled: boolean;
  sessionCacheHitRatePercent: number;
  sessionCacheLatencyMs: number;
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
  purpose?: EdgePurpose;
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
  seed?: number;
  requestKeyDistribution?: RequestKeyDistribution;
  requestKeySpaceSize?: number;
  customRequestKeys?: CustomRequestKey[];
}

export type SimulationState = 'idle' | 'running' | 'paused' | 'stopped';

export interface RequestHop {
  nodeId: string;
  nodeName: string;
  nodeType: ComponentType;
  enterTimeMs: number;
  exitTimeMs: number;
  latencyMs: number;
  queueWaitMs?: number;
  serviceTimeMs?: number;
  status: 'hit' | 'miss' | 'processed' | 'rejected' | 'queued' | 'error';
  viaEdgePurpose?: EdgePurpose;
  info?: string;
}

export interface SimRequest {
  id: string;
  timestamp: number;
  sourceNodeId: string;
  requestKey?: string;
  payloadSizeKb?: number;
  operationType?: 'read' | 'write';
  simulationSeed?: number;
  currentEdgeId?: string;
  currentEdgeProgress?: number; // 0 to 1
  path: RequestHop[];
  totalLatencyMs: number;
  queueWaitMs?: number;
  serviceTimeMs?: number;
  networkTimeMs?: number;
  status: 'in_flight' | 'success' | 'rate_limited' | 'timeout' | 'error' | 'dropped' | 'blocked';
  color: string;
}

export interface ComponentMetricSnapshot {
  nodeId: string;
  nodeName: string;
  nodeType: ComponentType;
  effectiveHealth?: NodeHealthStatus;
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
  cacheHits?: number;
  cacheMisses?: number;
  cacheBypasses?: number;
  cacheCoalescedRequests?: number;
  producerAccepted?: number;
  producerRejected?: number;
  consumerSucceeded?: number;
  consumerFailed?: number;
  messageRetries?: number;
  messageQueueAgeMs?: number;
  messagesDropped?: number;
  messagesExpired?: number;
  deadLettered?: number;
  cpuUtilizationPercent?: number;
  busyWorkers?: number;
  queuedWork?: number;
  workerProcessingLatencyMs?: number;
  workerRetries?: number;
  coldStarts?: number;
  warmStarts?: number;
  serverlessTimeouts?: number;
  coldStartProbabilityPercent?: number;
  serverlessThrottles?: number;
  serverlessInvocationFailures?: number;
  serverlessDownstreamFailures?: number;
  loadBalancerUnavailableFailures?: number;
  loadBalancerDistributionSkewPercent?: number;
  loadBalancerUnhealthyTargets?: number;
  apiGatewayThrottles?: number;
  apiGatewayTimeouts?: number;
  apiGatewayOpenCircuitRejections?: number;
  apiGatewayCircuitState?: 'closed' | 'open' | 'half_open';
  cdnOriginOffloadedRequests?: number;
  cdnOriginFetches?: number;
  cdnOriginFetchLatencyMs?: number;
  cdnOriginEgressKb?: number;
  dnsCacheHits?: number;
  dnsCacheMisses?: number;
  dnsResolutionFailures?: number;
  wafBlockedRequests?: number;
  wafInfrastructureFailures?: number;
  reverseProxyRejectedConnections?: number;
  reverseProxyCompressedKbSaved?: number;
  reverseProxyBackpressureMs?: number;
  sqlReads?: number;
  sqlWrites?: number;
  sqlPrimaryQueries?: number;
  sqlReplicaQueries?: number;
  sqlConnectionWaits?: number;
  sqlConnectionRejections?: number;
  sqlConnectionWaitMs?: number;
  sqlReplicationLagMs?: number;
  sqlFailovers?: number;
  sqlHotPartitionPercent?: number;
  nosqlReads?: number;
  nosqlWrites?: number;
  nosqlReadQuorum?: number;
  nosqlWriteQuorum?: number;
  nosqlReplicationLagMs?: number;
  nosqlHotPartitionPercent?: number;
  objectStorageRequestLatencyMs?: number;
  objectStorageTransferLatencyMs?: number;
  objectStorageTransferredKb?: number;
  searchQueries?: number;
  searchIndexWrites?: number;
  searchShardImbalancePercent?: number;
  graphTraversalDepth?: number;
  graphDepthLimitedQueries?: number;
  graphEffectiveCapacityQps?: number;
  graphCapacityRejectedQueries?: number;
  timeSeriesAcceptedWrites?: number;
  timeSeriesRejectedWrites?: number;
  timeSeriesQueries?: number;
  timeSeriesRetentionDays?: number;
  timeSeriesColdTierQueries?: number;
  timeSeriesColdTierLatencyFactor?: number;
  rateLimiterAccepted?: number;
  rateLimiterRejected?: number;
  rateLimiterQueued?: number;
  rateLimiterDecisionLatencyMs?: number;
  authCacheHits?: number;
  authCacheMisses?: number;
  authValidationLatencyMs?: number;
  encryptionOperations?: number;
  encryptionLatencyMs?: number;
  encryptedPayloadKb?: number;
}

export interface TimeSeriesDataPoint {
  timestampSec: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputQps: number;
  offeredLoadQps?: number;
  acceptedLoadQps?: number;
  droppedLoadQps?: number;
  queueWaitMs?: number;
  serviceTimeMs?: number;
  networkTimeMs?: number;
  errorRatePercent: number;
  cacheHitRatioPercent: number;
  activeRequests: number;
  cacheHits?: number;
  cacheMisses?: number;
  cacheBypasses?: number;
  cacheCoalescedRequests?: number;
}

export interface OverallMetrics {
  metricScope?: 'lifetime-totals-with-bounded-latency-window';
  latencyWindowSize?: number;
  totalRequestsSent: number;
  totalRequestsOffered?: number;
  totalRequestsAccepted?: number;
  totalRequestsCompleted?: number;
  totalRequestsDropped?: number;
  totalRequestsSuccess: number;
  totalRequestsFailed: number;
  currentQps: number;
  offeredLoadQps?: number;
  acceptedLoadQps?: number;
  completedThroughputQps?: number;
  droppedLoadQps?: number;
  avgEndToEndLatencyMs: number;
  successfulAvgLatencyMs?: number;
  failedAvgLatencyMs?: number;
  avgQueueWaitMs?: number;
  avgServiceTimeMs?: number;
  avgNetworkTimeMs?: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  overallErrorRatePercent: number;
  overallCacheHitRatioPercent: number;
  totalCacheHits?: number;
  totalCacheMisses?: number;
  totalCacheBypasses?: number;
  totalCacheCoalescedRequests?: number;
  totalProducerAccepted?: number;
  totalProducerRejected?: number;
  totalConsumerSucceeded?: number;
  totalConsumerFailed?: number;
  totalMessageRetries?: number;
  totalMessagesDropped?: number;
  totalMessagesExpired?: number;
  totalDeadLettered?: number;
  busiestNodeId?: string;
  slowestNodeId?: string;
  timeSeries: TimeSeriesDataPoint[];
  componentMetrics: Record<string, ComponentMetricSnapshot>;
}

export type BottleneckSeverity = 'warning' | 'critical';

export type BottleneckType =
  | 'spof'
  | 'capacity_overload'
  | 'high_error_rate'
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
  impactScore?: number;
  confidence?: 'low' | 'medium' | 'high';
  affectedTrafficPercent?: number;
  triggerPath?: string[];
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
  supports?: string;
  sourceType?: 'primary' | 'standard' | 'paper' | 'official' | 'secondary';
  lastVerifiedOn?: string;
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
  readWriteRatio?: string;
  retentionTimeline?: string;
}

export interface SerializedCanvasState {
  version?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  appVersion?: string;
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
  trafficConfig?: TrafficConfig;
  simulationMetadata?: {
    savedAt: number;
    appVersion: string;
    state?: SimulationState;
  };
}

export type ScenarioCategory =
  | 'Core / Classic'
  | 'Social & Messaging'
  | 'Streaming & Media'
  | 'E-Commerce & Payments'
  | 'Search & Discovery'
  | 'Infrastructure & Platform'
  | 'Data & Analytics'
  | 'Auth & Security'
  | 'IoT & Edge'
  | 'Gaming'
  | 'ML / AI Infrastructure'
  | 'Collaboration'
  | 'Maps & Geolocation'
  | 'Communication'
  | 'Content & Publishing';

export type ScenarioDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface Scenario {
  id: number;
  slug: string;
  title: string;
  category: ScenarioCategory;
  difficulty: ScenarioDifficulty;
  problemStatement: string;
  constraints: ScenarioConstraints;
  hints: ScenarioHint[];
  referenceDesign: SerializedCanvasState;
  discussionPoints: ScenarioDiscussionPoint[];
  sources: ScenarioReferenceSource[];
  trafficPreset: TrafficConfig;
  reviewOwner?: string;
  contentReviewedOn?: string;
  approximationNotes?: string[];
}

export interface CalculatorInputs {
  qps: number; // total operations per second: reads + writes
  payloadSizeKb: number; // write request body and stored-record size, decimal KB
  retentionDays: number;
  readWriteRatio: number; // e.g. 10 for 10:1 read to write
  replicationFactor: number;
  slaAvailabilityPercent: number;
  serverCapacityQps: number;
  readRequestPayloadKb?: number;
  readResponsePayloadKb?: number;
  writeResponsePayloadKb?: number;
  dbAverageServiceTimeMs?: number;
  dbTargetUtilizationPercent?: number;
  cacheWorkingSetDays?: number;
  cacheHotSetPercent?: number;
  cacheCompressionRatio?: number;
  serverTargetUtilizationPercent?: number;
  serverHeadroomPercent?: number;
  failoverCapacityPercent?: number;
  indexingOverheadPercent?: number;
  metadataOverheadPercent?: number;
  storageCompressionRatio?: number;
  annualGrowthPercent?: number;
}

export interface EstimateRange {
  low: number;
  expected: number;
  high: number;
}

export interface CalculatorOutputs {
  readQps: number;
  writeQps: number;
  dailyNewDataGb: number;
  totalStorageNeededTb: number;
  totalReplicatedStorageTb: number;
  inboundBandwidthMbps: number;
  outboundBandwidthMbps: number;
  estimatedServersNeeded: number;
  recommendedCacheMemoryGb: number;
  estimatedDbConnections: number;
  ranges: {
    replicatedStorageTb: EstimateRange;
    serversNeeded: EstimateRange;
    cacheMemoryGb: EstimateRange;
    dbConnections: EstimateRange;
  };
  assumptions: Record<string, number | string>;
  formulas: Record<string, string>;
}
