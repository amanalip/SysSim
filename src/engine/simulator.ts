import {
  AnyComponentConfig,
  ComponentMetricSnapshot,
  EdgePurpose,
  OverallMetrics,
  ProtocolEdgeData,
  RequestHop,
  SimRequest,
  SimulationState,
  TimeSeriesDataPoint,
  TrafficConfig,
} from '../model/types';
import { getEdgePurpose } from '../model/edge-semantics';
import { createSimRequest } from './request';
import { LoadBalancerRouter } from './routing/load-balancer';
import { CacheModel } from './components/cache-model';
import { RateLimiterModel } from './components/rate-limiter-model';
import {
  DeliveryGuarantee,
  MessageOrdering,
  MessagingModel,
  MessagingKind,
} from './components/messaging-model';
import { DatabaseModel } from './components/db-model';
import { AppServerModel } from './components/app-server-model';
import { WorkerModel } from './components/worker-model';
import { ServerlessModel } from './components/serverless-model';
import { LoadBalancerHealthModel } from './components/load-balancer-health-model';
import { ApiGatewayModel } from './components/api-gateway-model';
import { DnsModel } from './components/dns-model';
import { ReverseProxyModel } from './components/reverse-proxy-model';
import {
  GraphDatabaseModel,
  NoSqlDatabaseModel,
  ObjectStorageModel,
  SearchIndexModel,
  TimeSeriesDatabaseModel,
} from './components/storage-models';

export interface SimNode {
  id: string;
  config: AnyComponentConfig;
}

export interface SimEdge {
  id: string;
  source: string;
  target: string;
  data: ProtocolEdgeData;
}

export interface SimGraph {
  nodes: SimNode[];
  edges: SimEdge[];
}

interface TraversalResult {
  success: boolean;
  status: SimRequest['status'];
  latencyMs: number;
  hops: RequestHop[];
  cacheMiss: boolean;
  usedAsync: boolean;
}

interface PendingCacheFill {
  cacheNodeId: string;
  cacheKey: string;
  readyAtMs: number;
}

export class SysSimEngine {
  private graph: SimGraph = { nodes: [], edges: [] };
  private config: TrafficConfig = {
    pattern: 'steady',
    baseQps: 500,
    burstMultiplier: 3,
    rampDurationSec: 30,
    spikeFrequencySec: 10,
    seed: 1,
    requestKeyDistribution: 'uniform',
    requestKeySpaceSize: 100,
  };
  private speedMultiplier = 1;
  private state: SimulationState = 'idle';
  private randomState = 1;
  private requestSequence = 0;
  private clientSelectionCredits = new Map<string, number>();
  private currentRequestArrivalMs = 0;
  private currentRequestPayloadKb = 0;
  private currentRequestOperation: 'read' | 'write' = 'read';
  private zipfCumulativeWeights = new Map<number, number[]>();

  private elapsedSimulationMs = 0;
  private completedRequests: SimRequest[] = [];
  private activeRequests: SimRequest[] = [];

  // Metrics accumulators
  private totalSent = 0;
  private totalSuccess = 0;
  private totalFailed = 0;
  private nodeStats: Record<
    string,
    {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      latencies: number[];
      hits: number;
      misses: number;
      bypasses: number;
      coalescedRequests: number;
      queueDepth: number;
    }
  > = {};
  private timeSeries: TimeSeriesDataPoint[] = [];
  private fractionalRequestAccumulator = 0;

  // Component model instances cache
  private lbRouters: Map<string, LoadBalancerRouter> = new Map();
  private cacheModels: Map<string, CacheModel> = new Map();
  private rateLimiters: Map<string, RateLimiterModel> = new Map();
  private queueModels: Map<string, MessagingModel> = new Map();
  private dbModels: Map<string, DatabaseModel> = new Map();
  private noSqlModels: Map<string, NoSqlDatabaseModel> = new Map();
  private objectStorageModels: Map<string, ObjectStorageModel> = new Map();
  private searchIndexModels: Map<string, SearchIndexModel> = new Map();
  private graphDbModels: Map<string, GraphDatabaseModel> = new Map();
  private timeSeriesDbModels: Map<string, TimeSeriesDatabaseModel> = new Map();
  private appServerModels: Map<string, AppServerModel> = new Map();
  private workerModels: Map<string, WorkerModel> = new Map();
  private serverlessModels: Map<string, ServerlessModel> = new Map();
  private loadBalancerHealthModels: Map<string, LoadBalancerHealthModel> = new Map();
  private apiGatewayModels: Map<string, ApiGatewayModel> = new Map();
  private dnsModels: Map<string, DnsModel> = new Map();
  private reverseProxyModels: Map<string, ReverseProxyModel> = new Map();
  private activeConnections: Record<string, number> = {};
  private loadBalancerConnectionEnds = new Map<string, number[]>();
  private loadBalancerUnhealthyTargets = new Map<string, number>();
  private pendingCacheFills = new Map<string, PendingCacheFill>();
  private dnsSelections = new Map<string, string>();
  private reverseProxyReservations = new Map<string, number>();
  private cdnOriginMetrics = new Map<string, { fetches: number; latencyMs: number; egressKb: number }>();
  private wafMetrics = new Map<string, { blocked: number; infrastructureFailures: number }>();

  constructor(graph?: SimGraph, config?: TrafficConfig) {
    if (graph) this.setGraph(graph);
    if (config) this.setConfig(config);
  }

  public setGraph(graph: SimGraph): void {
    this.graph = graph;
    this.cacheModels.clear();
    this.rateLimiters.clear();
    this.queueModels.clear();
    this.dbModels.clear();
    this.noSqlModels.clear();
    this.objectStorageModels.clear();
    this.searchIndexModels.clear();
    this.graphDbModels.clear();
    this.timeSeriesDbModels.clear();
    this.appServerModels.clear();
    this.workerModels.clear();
    this.serverlessModels.clear();
    this.loadBalancerConnectionEnds.clear();
    this.loadBalancerUnhealthyTargets.clear();
    this.clientSelectionCredits.clear();
    this.pendingCacheFills.clear();
    this.dnsSelections.clear();
    this.reverseProxyReservations.clear();

    const validNodeIds = new Set(graph.nodes.map((n) => n.id));
    const validLoadBalancerIds = new Set(graph.nodes.filter((n) => n.config.type === 'load_balancer').map((n) => n.id));
    const validGatewayIds = new Set(graph.nodes.filter((n) => n.config.type === 'api_gateway').map((n) => n.id));
    const validDnsIds = new Set(graph.nodes.filter((n) => n.config.type === 'dns').map((n) => n.id));
    const validProxyIds = new Set(graph.nodes.filter((n) => n.config.type === 'reverse_proxy').map((n) => n.id));
    for (const id of this.lbRouters.keys()) if (!validLoadBalancerIds.has(id)) this.lbRouters.delete(id);
    for (const id of this.loadBalancerHealthModels.keys()) if (!validLoadBalancerIds.has(id)) this.loadBalancerHealthModels.delete(id);
    for (const id of this.apiGatewayModels.keys()) if (!validGatewayIds.has(id)) this.apiGatewayModels.delete(id);
    for (const id of this.dnsModels.keys()) if (!validDnsIds.has(id)) this.dnsModels.delete(id);
    for (const id of this.reverseProxyModels.keys()) if (!validProxyIds.has(id)) this.reverseProxyModels.delete(id);
    for (const id of Object.keys(this.nodeStats)) {
      if (!validNodeIds.has(id)) {
        delete this.nodeStats[id];
        delete this.activeConnections[id];
      }
    }

    this.graph.nodes.forEach((n) => {
      if (!this.nodeStats[n.id]) {
        this.nodeStats[n.id] = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          latencies: [],
          hits: 0,
          misses: 0,
          bypasses: 0,
          coalescedRequests: 0,
          queueDepth: 0,
        };
      }
      this.activeConnections[n.id] = 0;

      // Initialize models
      if (n.config.type === 'load_balancer') {
        const outgoing = this.graph.edges
          .filter(
            (e) =>
              e.source === n.id &&
              !e.data?.isCut &&
              getEdgePurpose(e.data) === 'request',
          )
          .map((e) => e.target);
        const existingRouter = this.lbRouters.get(n.id);
        if (existingRouter) {
          existingRouter.updateAlgorithm(n.config.algorithm || 'round_robin');
          existingRouter.updateTargets(outgoing, n.config.targetWeights);
        } else {
          this.lbRouters.set(
            n.id,
            new LoadBalancerRouter(n.config.algorithm || 'round_robin', outgoing, n.config.targetWeights),
          );
        }
        if (!this.loadBalancerHealthModels.has(n.id)) {
          this.loadBalancerHealthModels.set(n.id, new LoadBalancerHealthModel());
        }
      } else if (n.config.type === 'api_gateway') {
        const existingGateway = this.apiGatewayModels.get(n.id);
        if (existingGateway) existingGateway.updateConfig(n.config);
        else this.apiGatewayModels.set(n.id, new ApiGatewayModel(n.config));
      } else if (n.config.type === 'dns') {
        const targets = this.graph.edges.filter((edge) => edge.source === n.id && getEdgePurpose(edge.data) === 'request' && !edge.data?.isCut).map((edge) => edge.target);
        const existingDns = this.dnsModels.get(n.id);
        if (existingDns) existingDns.update(n.config, targets);
        else this.dnsModels.set(n.id, new DnsModel(n.config, targets));
      } else if (n.config.type === 'reverse_proxy') {
        const existingProxy = this.reverseProxyModels.get(n.id);
        if (existingProxy) existingProxy.updateConfig(n.config);
        else this.reverseProxyModels.set(n.id, new ReverseProxyModel(n.config));
      } else if (n.config.type === 'app_server') {
        this.appServerModels.set(n.id, new AppServerModel(
          n.config.replicas,
          n.config.processingLatencyMs,
          Math.max(0, n.config.maxThroughputQps || 0),
          n.config.maxConnections,
          n.config.health === 'degraded',
        ));
      } else if (n.config.type === 'worker') {
        this.workerModels.set(n.id, new WorkerModel(
          n.config.replicas, n.config.concurrencyLimit, n.config.jobProcessingRatePerSec,
          n.config.processingLatencyMs, n.config.retryLimit,
        ));
      } else if (n.config.type === 'serverless') {
        this.serverlessModels.set(n.id, new ServerlessModel(
          n.config.concurrencyLimit, n.config.timeoutMs, n.config.memoryMb,
          n.config.coldStartLatencyMs, n.config.baseExecutionLatencyMs,
          n.config.warmInstances, n.config.idleTimeoutSec, () => this.random(),
        ));
      } else if (
        n.config.type === 'cdn' ||
        n.config.type === 'redis_cache' ||
        n.config.type === 'local_cache' ||
        n.config.type === 'cdn_cache' ||
        n.config.type === 'browser_cache'
      ) {
        const config = n.config;
        const isServerCache = config.type === 'redis_cache' || config.type === 'local_cache';
        const sizeMb = isServerCache
          ? config.sizeMb
          : config.type === 'browser_cache'
            ? 1
            : config.type === 'cdn'
              ? Math.max(1, config.edgeLocationsCount) * 100
              : 100;
        const entrySizeKb = isServerCache ? config.entrySizeKb || 1 : 1;
        const sizeLimit = Math.max(1, Math.floor((sizeMb * 1024) / entrySizeKb));
        const defaultTtlSec = config.type === 'redis_cache'
          ? 300
          : config.type === 'local_cache'
            ? 60
            : config.type === 'cdn' || config.type === 'cdn_cache'
              ? 3600
              : 86400;
        const defaultReadLatencyMs = config.type === 'redis_cache'
          ? 2
          : config.type === 'local_cache'
            ? 0.5
            : config.type === 'cdn'
              ? Math.max(5, 80 / Math.sqrt(Math.max(1, config.edgeLocationsCount)))
              : config.type === 'cdn_cache'
                ? 8
              : 0.2;
        this.cacheModels.set(n.id, new CacheModel({
          sizeLimit,
          evictionPolicy: 'evictionPolicy' in config && config.evictionPolicy
            ? config.evictionPolicy
            : isServerCache ? 'LRU' : 'TTL',
          ttlMs: Math.max(
            1,
            config.type === 'cdn' ? config.cacheTtlSec : Number(config.ttlSec) || defaultTtlSec,
          ) * 1000,
          readLatencyMs: 'readLatencyMs' in config && Number.isFinite(config.readLatencyMs)
            ? config.readLatencyMs
            : defaultReadLatencyMs,
        }));
      } else if (n.config.type === 'rate_limiter') {
        this.rateLimiters.set(
          n.id,
          new RateLimiterModel(
            n.config.algorithm || 'token_bucket',
            n.config.limitQps || 1000,
            n.config.windowSizeSec || 1
          )
        );
      } else if (this.isMessagingNode(n)) {
        this.queueModels.set(n.id, this.createMessagingModel(n));
      } else if (n.config.type === 'sql_db') {
        this.dbModels.set(
          n.id,
          new DatabaseModel(
            n.config.baseLatencyMs,
            n.config.maxConnections,
            n.config.readReplicasCount,
            () => this.random(),
            {
              isolationLevel: n.config.isolationLevel,
              connectionQueueLimit: n.config.connectionQueueLimit,
              replicationLagMs: n.config.replicationLagMs,
              automaticFailover: n.config.automaticFailover,
              failoverLatencyMs: n.config.failoverLatencyMs,
              shardCount: n.config.shardCount,
            },
          )
        );
      } else if (n.config.type === 'nosql_db') {
        this.noSqlModels.set(n.id, new NoSqlDatabaseModel(n.config));
      } else if (n.config.type === 'object_storage') {
        this.objectStorageModels.set(n.id, new ObjectStorageModel(n.config));
      } else if (n.config.type === 'search_index') {
        this.searchIndexModels.set(n.id, new SearchIndexModel(n.config));
      } else if (n.config.type === 'graph_db') {
        this.graphDbModels.set(n.id, new GraphDatabaseModel(n.config));
      } else if (n.config.type === 'timeseries_db') {
        this.timeSeriesDbModels.set(n.id, new TimeSeriesDatabaseModel(n.config));
      }
    });
  }

  public setConfig(config: Partial<TrafficConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.seed !== undefined) this.randomState = this.normalizeSeed(config.seed);
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, multiplier);
  }

  public getState(): SimulationState {
    return this.state;
  }

  public start(): void {
    this.state = 'running';
  }

  public pause(): void {
    this.state = 'paused';
  }

  public resume(): void {
    this.state = 'running';
  }

  public stop(): void {
    this.state = 'stopped';
  }

  public reset(): void {
    this.state = 'idle';
    this.elapsedSimulationMs = 0;
    this.fractionalRequestAccumulator = 0;
    this.requestSequence = 0;
    this.randomState = this.normalizeSeed(this.config.seed ?? 1);
    this.completedRequests = [];
    this.activeRequests = [];
    this.totalSent = 0;
    this.totalSuccess = 0;
    this.totalFailed = 0;
    this.timeSeries = [];
    this.activeConnections = {};
    this.loadBalancerConnectionEnds.clear();
    this.rateLimiters.forEach((rl) => rl.reset());
    this.queueModels.forEach((q) => q.reset());
    this.dbModels.forEach((db) => db.reset());
    this.noSqlModels.forEach((db) => db.reset());
    this.objectStorageModels.forEach((storage) => storage.reset());
    this.searchIndexModels.forEach((search) => search.reset());
    this.graphDbModels.forEach((db) => db.reset());
    this.timeSeriesDbModels.forEach((db) => db.reset());
    this.appServerModels.forEach((server) => server.reset());
    this.workerModels.forEach((worker) => worker.reset());
    this.serverlessModels.forEach((serverless) => serverless.reset());
    this.loadBalancerHealthModels.forEach((health) => health.reset());
    this.lbRouters.forEach((router) => router.reset());
    this.apiGatewayModels.forEach((gateway) => gateway.reset());
    this.dnsModels.forEach((dns) => dns.reset());
    this.reverseProxyModels.forEach((proxy) => proxy.reset());
    this.cacheModels.forEach((c) => c.reset());
    this.pendingCacheFills.clear();
    this.dnsSelections.clear();
    this.reverseProxyReservations.clear();
    this.cdnOriginMetrics.clear();
    this.wafMetrics.clear();
    this.graph.nodes.forEach((n) => {
      this.nodeStats[n.id] = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        latencies: [],
        hits: 0,
        misses: 0,
        bypasses: 0,
        coalescedRequests: 0,
        queueDepth: 0,
      };
      this.activeConnections[n.id] = 0;
    });
  }

  public getCurrentQps(elapsedSec: number): number {
    const base = this.config.baseQps;
    switch (this.config.pattern) {
      case 'bursty': {
        const cycle = Math.floor(elapsedSec / 5) % 2;
        return cycle === 1 ? base * this.config.burstMultiplier : base;
      }
      case 'ramp': {
        const progress = Math.min(1, elapsedSec / (this.config.rampDurationSec || 30));
        return Math.floor(base * (0.2 + 0.8 * progress));
      }
      case 'spike': {
        const spikeEvery = this.config.spikeFrequencySec || 10;
        const isSpike = Math.floor(elapsedSec) % spikeEvery === 0;
        return isSpike ? base * 5 : base;
      }
      case 'custom': {
        if (this.config.customSchedule && this.config.customSchedule.length > 0) {
          const entry = [...this.config.customSchedule]
            .reverse()
            .find((s) => elapsedSec >= s.timeSec);
          return entry ? entry.qps : base;
        }
        return base;
      }
      default:
        return base;
    }
  }

  public step(deltaMs: number): {
    metrics: OverallMetrics;
    activeRequests: SimRequest[];
  } {
    if (this.state !== 'running') {
      return {
        metrics: this.getMetricsSnapshot(),
        activeRequests: this.activeRequests,
      };
    }

    const scaledDelta = deltaMs * this.speedMultiplier;
    this.elapsedSimulationMs += scaledDelta;
    this.flushReadyCacheFills();
    const elapsedSec = this.elapsedSimulationMs / 1000;

    // Consumer processing is independent of producer acknowledgement.
    this.drainMessaging(scaledDelta);
    this.dbModels.forEach((db) => db.drainConnections(scaledDelta));

    // Determine current rate and accumulate fractional requests per tick
    const currentQps = this.getCurrentQps(elapsedSec);
    this.fractionalRequestAccumulator += (currentQps * scaledDelta) / 1000;
    const requestsToGenerate = Math.floor(this.fractionalRequestAccumulator);
    this.fractionalRequestAccumulator -= requestsToGenerate;

    // Find origin client nodes (or any roots if no clients exist)
    const clientNodes = this.graph.nodes.filter((n) => n.config.type === 'client');
    const sourceNodes = clientNodes.length > 0 ? clientNodes : this.graph.nodes.slice(0, 1);

    if (sourceNodes.length > 0) {
      const selectedSources = this.selectTrafficSources(sourceNodes, requestsToGenerate);
      for (let i = 0; i < selectedSources.length; i++) {
        const source = selectedSources[i];
        const clientConfig = source.config.type === 'client' ? source.config : undefined;
        const requestKey = this.generateRequestKey(
          clientConfig?.requestKeyDistribution,
          clientConfig?.requestKeySpaceSize,
        );
        const operationType = clientConfig?.operationType === 'mixed'
          ? (this.random() * 100 < clientConfig.readPercentage ? 'read' : 'write')
          : clientConfig?.operationType || 'read';
        const arrivalTimeMs = this.elapsedSimulationMs - scaledDelta +
          ((i + 1) * scaledDelta) / (selectedSources.length + 1);
        const req = createSimRequest(
          source.id,
          arrivalTimeMs,
          requestKey,
          this.requestSequence++,
          {
            payloadSizeKb: clientConfig?.requestPayloadKb || 0,
            operationType,
          },
        );
        this.processRequest(req);
      }
    }

    // Retain only latest 100 active requests for rendering particles
    this.activeRequests = this.completedRequests.slice(-100);

    // Record time-series metrics point periodically (every ~1s in sim time)
    const currentSecBucket = Math.floor(elapsedSec);
    const lastBucket =
      this.timeSeries.length > 0
        ? this.timeSeries[this.timeSeries.length - 1].timestampSec
        : -1;

    if (currentSecBucket > lastBucket) {
      const snap = this.getMetricsSnapshot();
      this.timeSeries.push({
        timestampSec: currentSecBucket,
        p50LatencyMs: snap.p50LatencyMs,
        p95LatencyMs: snap.p95LatencyMs,
        p99LatencyMs: snap.p99LatencyMs,
        throughputQps: currentQps,
        errorRatePercent: snap.overallErrorRatePercent,
        cacheHitRatioPercent: snap.overallCacheHitRatioPercent,
        activeRequests: this.activeRequests.length,
        cacheHits: snap.totalCacheHits || 0,
        cacheMisses: snap.totalCacheMisses || 0,
        cacheBypasses: snap.totalCacheBypasses || 0,
        cacheCoalescedRequests: snap.totalCacheCoalescedRequests || 0,
      });

      if (this.timeSeries.length > 60) {
        this.timeSeries.shift();
      }
    }

    return {
      metrics: this.getMetricsSnapshot(),
      activeRequests: this.activeRequests,
    };
  }

  private processRequest(req: SimRequest): void {
    this.flushReadyCacheFills();
    this.totalSent++;
    this.currentRequestArrivalMs = req.timestamp;
    this.currentRequestPayloadKb = Math.max(0, req.payloadSizeKb || 0);
    this.currentRequestOperation = req.operationType || 'read';
    const result = this.traverseNode(
      req.sourceNodeId,
      req.id,
      req.requestKey || 'resource:0',
      req.sourceNodeId,
      0,
      new Set(),
    );

    req.path = result.hops;
    req.totalLatencyMs = result.latencyMs;
    req.status = result.success ? 'success' : result.status;

    if (result.success) {
      this.totalSuccess++;
      const hasCacheHit = result.hops.some((hop) => hop.status === 'hit');
      const hasMessagingHop = result.hops.some((hop) =>
        ['message_queue', 'pubsub', 'event_bus', 'task_queue'].includes(hop.nodeType),
      );
      if (result.usedAsync || hasMessagingHop) {
        req.color = '#a855f7';
      } else if (hasCacheHit) {
        req.color = '#06b6d4';
      } else {
        req.color = '#3fb950';
      }
    } else {
      this.totalFailed++;
      req.color = result.status === 'rate_limited' ? '#d29922' : '#f85149';
    }

    this.completedRequests.push(req);
    if (this.completedRequests.length > 1000) {
      this.completedRequests.shift();
    }
  }

  private traverseNode(
    nodeId: string,
    requestId: string,
    requestKey: string,
    sourceNodeId: string,
    startTimeMs: number,
    visited: Set<string>,
    viaEdgePurpose?: EdgePurpose,
    hopCount: number = 0,
  ): TraversalResult {
    const node = this.graph.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      return {
        success: false,
        status: 'error',
        latencyMs: 0,
        hops: [],
        cacheMiss: false,
        usedAsync: false,
      };
    }

    if (visited.has(nodeId) || hopCount >= 64) {
      return {
        success: false,
        status: 'error',
        latencyMs: 0,
        hops: [{
          nodeId: node.id,
          nodeName: node.config.name,
          nodeType: node.config.type,
          enterTimeMs: startTimeMs,
          exitTimeMs: startTimeMs,
          latencyMs: 0,
          status: 'error',
          viaEdgePurpose,
          info: visited.has(nodeId)
            ? 'Traversal stopped: cycle detected (64-hop TTL)'
            : 'Traversal stopped: 64-hop TTL exhausted',
        }],
        cacheMiss: false,
        usedAsync: false,
      };
    }

    const branchVisited = new Set(visited);
    branchVisited.add(nodeId);
    const nodeResult = this.processNode(
      node,
      requestId,
      requestKey,
      sourceNodeId,
      startTimeMs,
      viaEdgePurpose,
    );
    const cacheNode = this.isCacheNode(node);
    if (!nodeResult.success && !cacheNode) return nodeResult;

    if (cacheNode && nodeResult.success && nodeResult.hops[0]?.status === 'hit') {
      return nodeResult;
    }

    // Messaging hops acknowledge enqueue only. Consumers run during later
    // simulation steps so their processing is not charged to producer latency.
    if (this.isMessagingNode(node) && nodeResult.success) return nodeResult;

    const outgoingEdges = this.graph.edges.filter(
      (edge) => edge.source === nodeId && !edge.data?.isCut,
    );
    const edgesByPurpose = (purpose: EdgePurpose) =>
      outgoingEdges.filter((edge) => getEdgePurpose(edge.data) === purpose);

    let latencyMs = nodeResult.latencyMs;
    const hops = [...nodeResult.hops];
    let usedAsync = false;
    let primaryFailure: TraversalResult | null = nodeResult.success ? null : nodeResult;

    for (const edge of [
      ...edgesByPurpose('replication'),
      ...edgesByPurpose('observability'),
    ]) {
      this.traverseNode(
        edge.target,
        requestId,
        requestKey,
        sourceNodeId,
        0,
        branchVisited,
        getEdgePurpose(edge.data),
        hopCount + 1,
      );
    }

    for (const edge of edgesByPurpose('async')) {
      const edgeLatency = this.getEdgeLatency(edge);
      const asyncBranch = this.traverseNode(
        edge.target,
        requestId,
        requestKey,
        sourceNodeId,
        startTimeMs + latencyMs + edgeLatency,
        branchVisited,
        'async',
        hopCount + 1,
      );
      const acknowledgementHop = asyncBranch.hops[0];
      latencyMs += edgeLatency + (acknowledgementHop?.latencyMs || 0);
      if (acknowledgementHop) hops.push(acknowledgementHop);
      usedAsync = true;
      if (
        acknowledgementHop &&
        (acknowledgementHop.status === 'error' || acknowledgementHop.status === 'rejected')
      ) {
        primaryFailure = {
          success: false,
          status: asyncBranch.status,
          latencyMs,
          hops,
          cacheMiss: false,
          usedAsync,
        };
        break;
      }
    }

    const requestEdges = edgesByPurpose('request');
    const fanoutEdges = edgesByPurpose('fanout');
    const fallbackEdges = edgesByPurpose('fallback');

    if (cacheNode && nodeResult.cacheMiss && this.isRequestCoalescingEnabled(node)) {
      const pendingKey = this.getPendingCacheFillKey(node, requestKey, sourceNodeId);
      const pending = this.pendingCacheFills.get(pendingKey);
      if (pending) {
        const waitMs = Math.max(0, pending.readyAtMs - this.elapsedSimulationMs);
        const stats = this.nodeStats[node.id];
        if (stats) stats.coalescedRequests++;
        if (hops[0]) {
          hops[0] = {
            ...hops[0],
            exitTimeMs: hops[0].exitTimeMs + waitMs,
            latencyMs: hops[0].latencyMs + waitMs,
            info: 'Cache miss — coalesced behind in-flight origin fill',
          };
        }
        return {
          success: true,
          status: 'success',
          latencyMs: latencyMs + waitMs,
          hops,
          cacheMiss: true,
          usedAsync,
        };
      }
    }

    if (!nodeResult.cacheMiss && !primaryFailure && requestEdges.length > 0) {
      const selectedRequestEdges =
        node.config.type === 'load_balancer'
          ? this.selectLoadBalancerEdge(node.id, requestKey, sourceNodeId, requestEdges)
          : node.config.type === 'dns'
            ? requestEdges.filter((edge) => edge.target === this.dnsSelections.get(`${requestId}:${node.id}`))
            : requestEdges;

      if (selectedRequestEdges.length === 0) {
        primaryFailure = this.createRoutingFailure(
          node,
          startTimeMs + latencyMs,
          '502 Bad Gateway: Upstream selection failed',
        );
      } else {
        for (const edge of selectedRequestEdges) {
          const edgeLatency = this.getEdgeLatency(edge);
          const child = this.traverseNode(
            edge.target,
            requestId,
            requestKey,
            sourceNodeId,
            startTimeMs + latencyMs + edgeLatency,
            branchVisited,
            'request',
            hopCount + 1,
          );
          if (node.config.type === 'load_balancer') {
            this.recordLoadBalancerConnection(
              node.id,
              edge.target,
              this.currentRequestArrivalMs,
              this.currentRequestArrivalMs + edgeLatency + child.latencyMs,
            );
          }
          if (node.config.type === 'reverse_proxy') {
            this.reverseProxyModels.get(node.id)?.finish(
              this.reverseProxyReservations.get(`${requestId}:${node.id}`),
              this.currentRequestArrivalMs,
              edgeLatency + child.latencyMs,
            );
          }
          latencyMs += edgeLatency + child.latencyMs;
          hops.push(...child.hops);
          usedAsync ||= child.usedAsync;
          if (node.config.type === 'api_gateway') {
            const completion = this.apiGatewayModels.get(node.id)?.finish(
              this.currentRequestArrivalMs + latencyMs,
              edgeLatency + child.latencyMs,
              child.success,
            );
            if (completion?.timedOut) {
              const stats = this.nodeStats[node.id];
              if (stats) {
                stats.successfulRequests = Math.max(0, stats.successfulRequests - 1);
                stats.failedRequests++;
              }
              if (hops[0]) {
                hops[0] = {
                  ...hops[0],
                  status: 'error',
                  info: `${hops[0].info || 'Gateway policy'}; upstream timed out after ${node.config.timeoutMs}ms`,
                };
              }
              primaryFailure = { ...child, success: false, status: 'timeout' };
              break;
            }
          }
          if (!child.success) {
            if (node.config.type === 'serverless') {
              this.serverlessModels.get(node.id)?.recordDownstreamFailure();
            }
            primaryFailure = child;
            break;
          }
        }
      }
    }

    if (!nodeResult.cacheMiss && !primaryFailure && fanoutEdges.length > 0) {
      const fanoutStart = startTimeMs + latencyMs;
      const branchResults = fanoutEdges.map((edge) => {
        const edgeLatency = this.getEdgeLatency(edge);
        const child = this.traverseNode(
          edge.target,
          requestId,
          requestKey,
          sourceNodeId,
          fanoutStart + edgeLatency,
          branchVisited,
          'fanout',
          hopCount + 1,
        );
        return { ...child, latencyMs: edgeLatency + child.latencyMs };
      });

      latencyMs += Math.max(0, ...branchResults.map((result) => result.latencyMs));
      branchResults.forEach((result) => {
        hops.push(...result.hops);
        usedAsync ||= result.usedAsync;
      });
      primaryFailure = branchResults.find((result) => !result.success) || null;
    }

    const needsFallback = nodeResult.cacheMiss || primaryFailure !== null;
    const effectiveFallbackEdges = nodeResult.cacheMiss && fallbackEdges.length === 0
      ? requestEdges
      : fallbackEdges;
    if (needsFallback && effectiveFallbackEdges.length > 0) {
      if (cacheNode && !nodeResult.success) {
        const stats = this.nodeStats[node.id];
        if (stats) stats.bypasses++;
        if (hops[0]) hops[0].info = 'Cache unavailable — bypassing to origin fallback';
      }
      for (const edge of effectiveFallbackEdges) {
        const edgeLatency = this.getEdgeLatency(edge);
        const fallback = this.traverseNode(
          edge.target,
          requestId,
          requestKey,
          sourceNodeId,
          startTimeMs + latencyMs + edgeLatency,
          branchVisited,
          'fallback',
          hopCount + 1,
        );
        latencyMs += edgeLatency + fallback.latencyMs;
        hops.push(...fallback.hops);
        usedAsync ||= fallback.usedAsync;
        if (fallback.success) {
          if (cacheNode && nodeResult.cacheMiss) {
            if (node.config.type === 'cdn') {
              const cdnMetrics = this.getCdnOriginMetrics(node.id);
              cdnMetrics.fetches++;
              cdnMetrics.latencyMs += edgeLatency + fallback.latencyMs;
              cdnMetrics.egressKb += this.currentRequestPayloadKb;
            }
            this.scheduleCacheFill(
              node,
              requestKey,
              sourceNodeId,
              Math.max(1, fallback.latencyMs),
            );
          }
          return {
            success: true,
            status: 'success',
            latencyMs,
            hops,
            cacheMiss: false,
            usedAsync,
          };
        }
        primaryFailure = fallback;
      }
    }

    if (primaryFailure) {
      return {
        ...primaryFailure,
        latencyMs,
        hops,
        usedAsync,
      };
    }

    if (
      node.config.type === 'load_balancer' &&
      requestEdges.length === 0 &&
      fanoutEdges.length === 0 &&
      fallbackEdges.length === 0
    ) {
      const failure = this.createRoutingFailure(
        node,
        startTimeMs + latencyMs,
        '502 Bad Gateway: No request upstream targets available',
      );
      return {
        ...failure,
        latencyMs: latencyMs + failure.latencyMs,
        hops: [...hops, ...failure.hops],
        usedAsync,
      };
    }

    return {
      success: true,
      status: 'success',
      latencyMs,
      hops,
      cacheMiss: nodeResult.cacheMiss,
      usedAsync,
    };
  }

  private processNode(
    node: SimNode,
    requestId: string,
    requestKey: string,
    sourceNodeId: string,
    startTimeMs: number,
    viaEdgePurpose?: EdgePurpose,
  ): TraversalResult {
    const config = node.config;
    const stats = this.nodeStats[node.id] || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      latencies: [],
      hits: 0,
      misses: 0,
      bypasses: 0,
      coalescedRequests: 0,
      queueDepth: 0,
    };
    this.nodeStats[node.id] = stats;
    stats.totalRequests++;

    const failure = (status: SimRequest['status'], latencyMs: number, info: string) => {
      stats.failedRequests++;
      return {
        success: false,
        status,
        latencyMs,
        hops: [
          {
            nodeId: node.id,
            nodeName: config.name,
            nodeType: config.type,
            enterTimeMs: startTimeMs,
            exitTimeMs: startTimeMs + latencyMs,
            latencyMs,
            status: status === 'rate_limited' || status === 'blocked' ? 'rejected' : 'error',
            info,
            viaEdgePurpose,
          },
        ],
        cacheMiss: false,
        usedAsync: false,
      } satisfies TraversalResult;
    };

    if (config.health === 'down') {
      if (config.type === 'serverless') this.serverlessModels.get(node.id)?.recordInvocationFailure();
      if (config.type === 'firewall') this.getWafMetrics(node.id).infrastructureFailures++;
      return failure(
        'error',
        1,
        this.isCacheNode(node) ? 'Cache unavailable' : 'Component is down',
      );
    }

    if (config.failureRatePercent && this.random() * 100 < config.failureRatePercent) {
      if (config.type === 'serverless') this.serverlessModels.get(node.id)?.recordInvocationFailure();
      if (config.type === 'firewall') this.getWafMetrics(node.id).infrastructureFailures++;
      return failure('error', 5, 'Simulated component fault');
    }

    let hopLatency = 5;
    let hopStatus: RequestHop['status'] = 'processed';
    let hopInfo: string | undefined;

    if (config.type === 'client') {
      const protocolOverheadMs = config.connectionType === 'WebSocket'
        ? 0.5
        : config.connectionType === 'HTTP/3'
          ? 1
          : 2;
      hopLatency = protocolOverheadMs + Math.max(0, config.requestPayloadKb) * 0.01;
      hopInfo = `${config.connectionType}; ${this.currentRequestOperation}; ${this.currentRequestPayloadKb} KB payload`;
    } else if (config.type === 'app_server') {
      const service = this.appServerModels.get(node.id)?.process(this.currentRequestArrivalMs);
      hopLatency = service?.totalLatencyMs ?? Math.max(0, config.processingLatencyMs);
      if (service) {
        this.activeConnections[node.id] = service.activeConnections;
        stats.queueDepth = service.queuedRequests;
      }
      hopInfo = service && service.queueLatencyMs > 0
        ? `${service.processingLatencyMs}ms service + ${Math.round(service.queueLatencyMs * 10) / 10}ms connection queue${service.degraded ? '; degraded capacity' : ''}`
        : `${service?.processingLatencyMs ?? config.processingLatencyMs}ms service; no connection queue${service?.degraded ? '; degraded capacity' : ''}`;
    } else if (config.type === 'worker') {
      hopLatency = this.workerModels.get(node.id)?.getProcessingLatencyMs() ?? config.processingLatencyMs;
      hopInfo = `${config.replicas} replica${config.replicas === 1 ? '' : 's'} × ${config.concurrencyLimit} concurrent; retry limit ${config.retryLimit}`;
    } else if (config.type === 'sql_db') {
      const dbModel = this.dbModels.get(node.id);
      const isWrite = this.currentRequestOperation === 'write';
      const query = dbModel?.executeQuery(isWrite, config.shardingKey ? requestKey : 'unsharded', config.health);
      if (query?.rejected) return failure('dropped', query.latencyMs, 'SQL connection queue full; query rejected');
      hopLatency = query?.latencyMs ?? config.baseLatencyMs;
      hopInfo = query
        ? `${isWrite ? 'Write' : 'Read'} routed to ${query.role === 'primary' ? 'primary' : `read replica ${(query.replicaIndex || 0) + 1}`}` +
          `${query.connectionWaitMs ? ` after ${query.connectionWaitMs}ms connection wait` : ''}` +
          `${query.replicationLagMs ? `; up to ${query.replicationLagMs}ms replica lag` : ''}` +
          `${query.failedOver ? `; automatic failover added ${config.failoverLatencyMs}ms` : ''}` +
          `${config.shardCount > 1 ? `; shard ${query.shardIndex + 1}/${config.shardCount} by ${config.shardingKey || 'unconfigured key'}` : '; unsharded'}` +
          `; ${config.isolationLevel}`
        : `${isWrite ? 'Write' : 'Read'} on primary`;
      stats.queueDepth = dbModel?.getMetrics().queuedConnections || 0;
    } else if (config.type === 'nosql_db') {
      const isWrite = this.currentRequestOperation === 'write';
      const result = this.noSqlModels.get(node.id)?.execute(isWrite, config.partitionKey ? requestKey : 'unpartitioned');
      hopLatency = result?.latencyMs ?? config.baseLatencyMs;
      hopInfo = result
        ? `${isWrite ? 'Write' : 'Read'} partition ${result.partitionIndex + 1}/${config.partitionCount}; R=${result.readQuorum}, W=${result.writeQuorum}, N=${config.replicas}` +
          `${result.visibleLagMs ? `; visible lag up to ${result.visibleLagMs}ms` : '; synchronous visibility'}` +
          `; ${config.consistencyLevel}`
        : `${isWrite ? 'Write' : 'Read'} NoSQL operation`;
    } else if (config.type === 'object_storage') {
      const result = this.objectStorageModels.get(node.id)?.execute(this.currentRequestPayloadKb);
      hopLatency = result?.latencyMs ?? config.latencyMs;
      hopInfo = result
        ? `${config.storageClass}: ${Math.round(result.requestLatencyMs * 10) / 10}ms request + ${Math.round(result.transferLatencyMs * 10) / 10}ms transfer for ${this.currentRequestPayloadKb} KB at ${config.throughputMbPerSec} MB/s`
        : `${config.storageClass} object request`;
    } else if (config.type === 'search_index') {
      const isWrite = this.currentRequestOperation === 'write';
      const result = this.searchIndexModels.get(node.id)?.execute(isWrite, requestKey);
      hopLatency = result?.latencyMs ?? (isWrite ? config.indexingLatencyMs : config.queryLatencyMs);
      hopInfo = result
        ? `${result.operation === 'index' ? 'Index write' : 'Search query'} on shard ${result.shardIndex + 1}/${config.shards}; ${config.replicas} replica${config.replicas === 1 ? '' : 's'}`
        : isWrite ? 'Index write' : 'Search query';
    } else if (config.type === 'graph_db') {
      const result = this.graphDbModels.get(node.id)?.execute(this.currentRequestArrivalMs);
      if (result && !result.accepted) return failure('dropped', result.latencyMs, `Graph query capacity exceeded (${result.effectiveCapacityQps}/s at depth ${result.actualDepth})`);
      hopLatency = result?.latencyMs ?? config.queryLatencyMs;
      hopInfo = result
        ? `Traversal depth ${result.actualDepth}/${config.traversalDepthLimit}${result.limited ? ` (requested ${result.requestedDepth}; clamped)` : ''}; latency grows depth^1.35`
        : 'Graph traversal';
    } else if (config.type === 'timeseries_db') {
      const isWrite = this.currentRequestOperation === 'write';
      const result = this.timeSeriesDbModels.get(node.id)?.execute(isWrite, this.currentRequestArrivalMs);
      if (result && !result.accepted) return failure('dropped', result.latencyMs, `Time-series write throughput exceeded (${config.writeThroughputPerSec}/s)`);
      hopLatency = result?.latencyMs ?? config.queryLatencyMs;
      hopInfo = isWrite
        ? `Write admitted within ${config.writeThroughputPerSec}/s limit; ${config.retentionDays}-day retention`
        : `Query over ${config.retentionDays}-day retention; scan factor ${Math.round((result?.retentionScanFactor || 1) * 100) / 100}×`;
    } else if (
      config.type === 'cdn' ||
      config.type === 'redis_cache' ||
      config.type === 'local_cache' ||
      config.type === 'cdn_cache' ||
      config.type === 'browser_cache'
    ) {
      const cacheModel = this.cacheModels.get(node.id);
      const targetHitPercent = Math.min(100, Math.max(0, config.hitRatioPercent));
      const cacheAccess = cacheModel
        ? cacheModel.access(
            this.getCacheKey(node, requestKey, sourceNodeId),
            this.elapsedSimulationMs,
            this.random() * 100 < targetHitPercent,
          )
        : { hit: false, latencyMs: 2 };
      if (cacheAccess.hit) {
        hopLatency = cacheAccess.latencyMs;
        hopStatus = 'hit';
        hopInfo = config.type === 'cdn'
          ? `CDN edge hit — ${Math.round(cacheAccess.latencyMs * 10) / 10}ms nearest-edge assumption; origin offloaded`
          : 'Cache hit — served without origin';
        stats.hits++;
      } else {
        const shieldLatencyMs = config.type === 'cdn' && config.originShielding ? 10 : 0;
        hopLatency = cacheAccess.latencyMs + shieldLatencyMs;
        hopStatus = 'miss';
        hopInfo = config.type === 'cdn'
          ? `CDN edge miss — ${Math.round(cacheAccess.latencyMs * 10) / 10}ms edge${shieldLatencyMs ? ` + ${shieldLatencyMs}ms origin shield` : ''}; fetching origin`
          : 'Cache miss — forwarding to origin fallback';
        stats.misses++;
      }
    } else if (config.type === 'rate_limiter') {
      const allowed = this.rateLimiters.get(node.id)?.allowRequest(this.elapsedSimulationMs) ?? true;
      if (!allowed) return failure('rate_limited', 1, 'Request rejected by rate limiter');
    } else if (config.type === 'api_gateway') {
      const admission = this.apiGatewayModels.get(node.id)?.begin(this.currentRequestArrivalMs);
      if (admission && !admission.allowed) {
        return failure(
          'rate_limited',
          admission.latencyMs,
          admission.reason === 'open_circuit'
            ? 'Request rejected: gateway circuit is open'
            : `Request throttled at configured ${config.rateLimitQps} QPS limit`,
        );
      }
      hopLatency = admission?.latencyMs ?? 0;
      hopInfo = `${config.authMode === 'None' ? 'No authentication' : `${config.authMode} authentication`} overhead`;
    } else if (config.type === 'dns') {
      const requestEdges = this.graph.edges.filter((edge) => edge.source === node.id && !edge.data?.isCut && getEdgePurpose(edge.data) === 'request');
      const eligibleEdges = requestEdges.filter((edge) => this.graph.nodes.find((candidate) => candidate.id === edge.target)?.config.health !== 'down');
      const edgeLatencies = Object.fromEntries(eligibleEdges.map((edge) => [edge.target, this.getEdgeLatency(edge)]));
      const resolution = this.dnsModels.get(node.id)?.resolve(
        `${sourceNodeId}:${requestKey}`,
        sourceNodeId,
        this.currentRequestArrivalMs,
        eligibleEdges.map((edge) => edge.target),
        edgeLatencies,
      );
      if (!resolution?.targetId) return failure('error', resolution?.latencyMs ?? config.lookupLatencyMs, 'DNS resolution failed: no eligible address records');
      this.dnsSelections.set(`${requestId}:${node.id}`, resolution.targetId);
      hopLatency = resolution.latencyMs;
      hopInfo = resolution.cached
        ? `DNS cache hit; resolved to ${resolution.targetId}; application traffic continues directly to the address`
        : `${config.routingPolicy} DNS lookup; resolved to ${resolution.targetId}; TTL ${config.ttlSec}s`;
    } else if (config.type === 'firewall') {
      const ruleLatencyMs = Math.min(5, Math.max(0, config.ruleCount) * 0.005);
      hopLatency = Math.max(0, config.inspectionLatencyMs) + ruleLatencyMs;
      if (this.random() * 100 < Math.min(100, Math.max(0, config.blockRatePercent))) {
        this.getWafMetrics(node.id).blocked++;
        return failure('blocked', hopLatency, `Malicious request rejected by WAF after ${config.ruleCount} rule checks`);
      }
      hopInfo = `WAF allowed request; ${config.inspectionLatencyMs}ms inspection + ${Math.round(ruleLatencyMs * 1000) / 1000}ms documented rule-scan cost`;
    } else if (config.type === 'reverse_proxy') {
      const proxy = this.reverseProxyModels.get(node.id)?.begin(this.currentRequestArrivalMs, this.currentRequestPayloadKb);
      if (proxy && !proxy.accepted) return failure('dropped', proxy.latencyMs, `Reverse proxy connection limit ${config.maxConnections} exhausted`);
      hopLatency = proxy?.latencyMs ?? 1;
      if (proxy) {
        this.reverseProxyReservations.set(`${requestId}:${node.id}`, proxy.reservationId || 0);
        this.currentRequestPayloadKb = proxy.outputPayloadKb;
      }
      hopInfo = `${config.enableCompression ? `Compressed payload to ${Math.round((proxy?.outputPayloadKb || 0) * 10) / 10} KB` : 'Compression disabled'}; ${config.bufferingEnabled ? `${config.bufferSizeKb} KB buffer` : 'streaming without buffer'}${proxy?.backpressureMs ? `; ${Math.round(proxy.backpressureMs * 10) / 10}ms backpressure` : ''}; cache rules are diagram-only`;
    } else if (this.isMessagingNode(node)) {
      const enqueue = this.queueModels.get(node.id)?.enqueue(
        requestId,
        requestKey,
        this.elapsedSimulationMs,
        {
          payloadSizeKb: this.currentRequestPayloadKb,
          operationType: this.currentRequestOperation,
        },
      );
      if (enqueue) {
        stats.queueDepth = enqueue.depth;
        if (!enqueue.accepted) return failure('dropped', 4, 'Queue capacity exceeded');
      }
      hopLatency = enqueue?.acknowledgementLatencyMs ?? 4;
      hopStatus = 'queued';
      hopInfo = enqueue
        ? `Producer acknowledged; partition ${enqueue.partition}; ${enqueue.deliveryCopies} delivery copy${enqueue.deliveryCopies === 1 ? '' : 'ies'} queued`
        : 'Producer acknowledged';
    } else if (config.type === 'auth_service') {
      hopLatency = Math.max(1, config.validationLatencyMs || 4);
    } else if (config.type === 'encryption_service') {
      hopLatency = Math.max(1, config.overheadLatencyMs || 3);
    } else if (config.type === 'serverless') {
      const invocation = this.serverlessModels.get(node.id)?.invoke(this.currentRequestArrivalMs);
      if (invocation) {
        if (invocation.throttled) {
          return failure('rate_limited', invocation.totalLatencyMs, 'Invocation throttled: concurrency limit exhausted');
        }
        hopLatency = invocation.totalLatencyMs;
        this.activeConnections[node.id] = invocation.activeInvocations;
        stats.queueDepth = invocation.queuedInvocations;
        hopInfo = `${invocation.coldStart ? 'Cold' : 'Warm'} start (${invocation.coldStartProbabilityPercent}% cold probability); ${Math.round(invocation.executionLatencyMs * 10) / 10}ms memory-scaled execution${invocation.queueLatencyMs ? ` + ${Math.round(invocation.queueLatencyMs * 10) / 10}ms concurrency queue` : ''}`;
        if (invocation.timedOut) return failure('timeout', hopLatency, `${hopInfo}; timed out at ${config.timeoutMs}ms`);
      }
    }

    stats.latencies.push(hopLatency);
    if (stats.latencies.length > 500) stats.latencies.shift();
    stats.successfulRequests++;

    return {
      success: true,
      status: 'success',
      latencyMs: hopLatency,
      hops: [
        {
          nodeId: node.id,
          nodeName: config.name,
          nodeType: config.type,
          enterTimeMs: startTimeMs,
          exitTimeMs: startTimeMs + hopLatency,
          latencyMs: hopLatency,
          status: hopStatus,
          info: hopInfo,
          viaEdgePurpose,
        },
      ],
      cacheMiss: hopStatus === 'miss',
      usedAsync: false,
    };
  }

  private selectLoadBalancerEdge(
    nodeId: string,
    requestKey: string,
    sourceNodeId: string,
    requestEdges: SimEdge[],
  ): SimEdge[] {
    const loadBalancer = this.graph.nodes.find((candidate) => candidate.id === nodeId);
    if (loadBalancer?.config.type !== 'load_balancer') return [];
    const loadBalancerConfig = loadBalancer.config;
    const healthModel = this.loadBalancerHealthModels.get(nodeId);
    const eligibleEdges = requestEdges.filter((edge) => {
      const target = this.graph.nodes.find((candidate) => candidate.id === edge.target);
      return Boolean(target && healthModel?.isEligible(
        edge.target,
        target.config.health,
        this.currentRequestArrivalMs,
        loadBalancerConfig.healthCheckIntervalSec,
        loadBalancerConfig.healthRecoveryDelaySec,
      ));
    });
    this.loadBalancerUnhealthyTargets.set(nodeId, requestEdges.length - eligibleEdges.length);
    const router = this.lbRouters.get(nodeId);
    router?.updateTargets(eligibleEdges.map((edge) => edge.target), loadBalancerConfig.targetWeights);
    const activeConnections = this.getLoadBalancerActiveConnections(
      nodeId,
      eligibleEdges.map((edge) => edge.target),
      this.currentRequestArrivalMs,
    );
    this.activeConnections[nodeId] = Object.values(activeConnections).reduce((sum, value) => sum + value, 0);
    const target = router?.selectTarget({
      requestKey,
      clientKey: sourceNodeId,
      activeConnections,
      stickySession: loadBalancerConfig.stickySession,
    });
    if (!target) {
      router?.recordUnavailableTargetFailure();
      return [];
    }
    const selected = eligibleEdges.find((edge) => edge.target === target);
    return selected ? [selected] : [];
  }

  private getLoadBalancerActiveConnections(loadBalancerId: string, targetIds: string[], nowMs: number): Record<string, number> {
    const result: Record<string, number> = {};
    for (const targetId of targetIds) {
      const connectionKey = `${loadBalancerId}:${targetId}`;
      const activeEnds = (this.loadBalancerConnectionEnds.get(connectionKey) || []).filter((endAt) => endAt > nowMs);
      this.loadBalancerConnectionEnds.set(connectionKey, activeEnds);
      result[targetId] = activeEnds.length;
    }
    return result;
  }

  private recordLoadBalancerConnection(
    loadBalancerId: string,
    targetId: string,
    startAtMs: number,
    endAtMs: number,
  ): void {
    const connectionKey = `${loadBalancerId}:${targetId}`;
    const activeEnds = (this.loadBalancerConnectionEnds.get(connectionKey) || []).filter((endAt) => endAt > startAtMs);
    activeEnds.push(Math.max(startAtMs, endAtMs));
    this.loadBalancerConnectionEnds.set(connectionKey, activeEnds);
    const loadBalancer = this.graph.nodes.find((node) => node.id === loadBalancerId);
    if (loadBalancer) {
      const targets = this.graph.edges
        .filter((edge) => edge.source === loadBalancerId && getEdgePurpose(edge.data) === 'request' && !edge.data?.isCut)
        .map((edge) => edge.target);
      this.activeConnections[loadBalancerId] = Object.values(
        this.getLoadBalancerActiveConnections(loadBalancerId, targets, startAtMs),
      ).reduce((sum, value) => sum + value, 0);
    }
  }

  private createRoutingFailure(
    node: SimNode,
    startTimeMs: number,
    info: string,
  ): TraversalResult {
    const stats = this.nodeStats[node.id];
    if (stats) stats.failedRequests++;
    return {
      success: false,
      status: 'error',
      latencyMs: 2,
      hops: [
        {
          nodeId: node.id,
          nodeName: node.config.name,
          nodeType: node.config.type,
          enterTimeMs: startTimeMs,
          exitTimeMs: startTimeMs + 2,
          latencyMs: 2,
          status: 'error',
          info,
        },
      ],
      cacheMiss: false,
      usedAsync: false,
    };
  }

  private getEdgeLatency(edge: SimEdge): number {
    if (edge.data?.latencyMs !== undefined) return edge.data.latencyMs;
    const protocol = edge.data?.protocol || 'HTTP';
    if (protocol === 'gRPC') return 1;
    if (protocol === 'WebSocket' || protocol === 'TCP') return 2;
    if (protocol === 'pub/sub' || protocol === 'MQTT') return 3;
    return 4;
  }

  private isCacheNode(node: SimNode): boolean {
    return ['cdn', 'redis_cache', 'local_cache', 'cdn_cache', 'browser_cache'].includes(node.config.type);
  }

  private isMessagingNode(node: SimNode): boolean {
    return ['message_queue', 'task_queue', 'pubsub', 'event_bus'].includes(node.config.type);
  }

  private createMessagingModel(node: SimNode): MessagingModel {
    const config = node.config;
    const common = {
      kind: config.type as MessagingKind,
      producerAckLatencyMs: 'producerAckLatencyMs' in config ? config.producerAckLatencyMs : 4,
      consumerProcessingLatencyMs: 'consumerProcessingLatencyMs' in config
        ? config.consumerProcessingLatencyMs
        : 10,
      deliveryGuarantee: ('deliveryGuarantee' in config
        ? config.deliveryGuarantee
        : 'at_least_once') as DeliveryGuarantee,
      orderingGuarantee: ('orderingGuarantee' in config
        ? config.orderingGuarantee
        : 'None') as MessageOrdering,
      retryLimit: 'retryLimit' in config ? config.retryLimit : 3,
      retryDelayMs: 'retryDelayMs' in config ? config.retryDelayMs : 100,
      deadLetterQueue: 'deadLetterQueue' in config ? config.deadLetterQueue : true,
      retentionMs: ('retentionHours' in config ? config.retentionHours : 24) * 60 * 60 * 1000,
      overflowPolicy: 'overflowPolicy' in config ? config.overflowPolicy : 'reject_newest',
    };

    if (config.type === 'message_queue') {
      return new MessagingModel({
        ...common,
        kind: config.type,
        maxDepth: config.maxDepth || 50000,
        partitions: config.partitions || 8,
        consumerGroups: config.consumerGroups || 1,
        subscribersPerTopic: 1,
        fanoutFactor: 1,
        throughputPerPartitionPerSec: config.consumerThroughputPerSec || 2000,
      });
    }
    if (config.type === 'pubsub') {
      return new MessagingModel({
        ...common,
        kind: config.type,
        maxDepth: config.maxDepth || 50000,
        partitions: config.topicCount || 1,
        consumerGroups: 1,
        subscribersPerTopic: config.subscribersPerTopic || 1,
        fanoutFactor: 1,
        throughputPerPartitionPerSec: config.consumerThroughputPerSec || 2000,
      });
    }
    if (config.type === 'event_bus') {
      const fanout = Math.max(1, config.fanoutFactor || 1);
      return new MessagingModel({
        ...common,
        kind: config.type,
        maxDepth: config.maxDepth || 50000,
        partitions: fanout,
        consumerGroups: 1,
        subscribersPerTopic: 1,
        fanoutFactor: fanout,
        throughputPerPartitionPerSec: Math.max(1, (config.throughputPerSec || 10000) / fanout),
      });
    }
    if (config.type === 'task_queue') {
      return new MessagingModel({
        ...common,
        kind: config.type,
        maxDepth: config.maxDepth || 10000,
        partitions: 1,
        consumerGroups: 1,
        subscribersPerTopic: 1,
        fanoutFactor: 1,
        throughputPerPartitionPerSec: config.consumerThroughputPerSec || 500,
      });
    }
    throw new Error(`Unsupported messaging component: ${config.type}`);
  }

  private drainMessaging(deltaMs: number): void {
    this.workerModels.forEach((worker) => worker.beginStep());
    for (const [nodeId, model] of this.queueModels) {
      const edges = this.graph.edges.filter((edge) => {
        if (edge.source !== nodeId || edge.data?.isCut) return false;
        const purpose = getEdgePurpose(edge.data);
        return purpose === 'request' || purpose === 'fanout' || purpose === 'async';
      });
      if (edges.length === 0) continue;

      let totalRate = 0;
      let totalConcurrency = 0;
      for (const edge of edges) {
        const target = this.graph.nodes.find((node) => node.id === edge.target);
        if (!target || target.config.health === 'down') continue;
        if (target.config.type === 'worker') {
          const replicas = Math.max(1, target.config.replicas || 1);
          totalRate += Math.max(0, target.config.jobProcessingRatePerSec || 0) * replicas;
          totalConcurrency += Math.max(1, target.config.concurrencyLimit || 1) * replicas;
        } else if (target.config.type === 'serverless') {
          totalRate += Math.max(1, target.config.maxThroughputQps || 1);
          totalConcurrency += Math.max(1, target.config.concurrencyLimit || 1);
        } else {
          totalRate += Math.max(1, target.config.maxThroughputQps || 100);
          totalConcurrency += 1;
        }
      }
      if (totalRate <= 0 || totalConcurrency <= 0) continue;

      model.drain(
        deltaMs,
        this.elapsedSimulationMs,
        { replicas: 1, concurrencyLimit: totalConcurrency, processingRatePerSec: totalRate },
        (attempt) => {
          this.currentRequestArrivalMs = this.elapsedSimulationMs;
          this.currentRequestPayloadKb = Math.max(0, attempt.payloadSizeKb || 0);
          this.currentRequestOperation = attempt.operationType || 'read';
          const edge = edges[attempt.recipientIndex % edges.length];
          const result = this.traverseNode(
            edge.target,
            `${attempt.deliveryId}:attempt-${attempt.attempt}`,
            attempt.requestKey,
            nodeId,
            0,
            new Set([nodeId]),
            getEdgePurpose(edge.data),
            1,
          );
          const target = this.graph.nodes.find((candidate) => candidate.id === edge.target);
          if (target?.config.type === 'worker') {
            const worker = this.workerModels.get(target.id);
            const retryLimit = worker?.retryLimit ?? target.config.retryLimit;
            const broker = this.graph.nodes.find((candidate) => candidate.id === nodeId);
            const brokerRetryLimit = broker && 'retryLimit' in broker.config
              ? broker.config.retryLimit
              : retryLimit;
            worker?.recordAttempt(
              result.success,
              !result.success && attempt.attempt <= Math.min(retryLimit, brokerRetryLimit),
            );
            return { success: result.success, retryLimit };
          }
          return result.success;
        },
      );
      const stats = this.nodeStats[nodeId];
      if (stats) stats.queueDepth = model.getDepth();
      const workers = edges
        .map((edge) => this.graph.nodes.find((candidate) => candidate.id === edge.target))
        .filter((target) => target?.config.type === 'worker');
      const queuedPerWorker = workers.length > 0 ? Math.ceil(model.getDepth() / workers.length) : 0;
      workers.forEach((target) => target && this.workerModels.get(target.id)?.setQueuedWork(queuedPerWorker));
    }
  }

  private getCacheKey(node: SimNode, requestKey: string, sourceNodeId: string): string {
    if (node.config.type === 'browser_cache') return `${sourceNodeId}:${requestKey}`;
    if (node.config.type === 'cdn') {
      const edgeCount = Math.max(1, Math.floor(node.config.edgeLocationsCount));
      return `edge-${this.stableHash(sourceNodeId) % edgeCount}:${requestKey}`;
    }
    return requestKey;
  }

  private isRequestCoalescingEnabled(node: SimNode): boolean {
    return this.isCacheNode(node) && 'requestCoalescingEnabled' in node.config
      ? node.config.requestCoalescingEnabled
      : node.config.type === 'cdn'
        ? node.config.originShielding
        : node.config.type === 'cdn_cache' || node.config.type === 'browser_cache';
  }

  private getPendingCacheFillKey(node: SimNode, requestKey: string, sourceNodeId: string): string {
    if (node.config.type === 'cdn' && node.config.originShielding) return `${node.id}:shield:${requestKey}`;
    return `${node.id}:${this.getCacheKey(node, requestKey, sourceNodeId)}`;
  }

  private stableHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private getCdnOriginMetrics(nodeId: string) {
    let metrics = this.cdnOriginMetrics.get(nodeId);
    if (!metrics) {
      metrics = { fetches: 0, latencyMs: 0, egressKb: 0 };
      this.cdnOriginMetrics.set(nodeId, metrics);
    }
    return metrics;
  }

  private getWafMetrics(nodeId: string) {
    let metrics = this.wafMetrics.get(nodeId);
    if (!metrics) {
      metrics = { blocked: 0, infrastructureFailures: 0 };
      this.wafMetrics.set(nodeId, metrics);
    }
    return metrics;
  }

  private scheduleCacheFill(
    node: SimNode,
    requestKey: string,
    sourceNodeId: string,
    originLatencyMs: number,
  ): void {
    const cacheKey = this.getCacheKey(node, requestKey, sourceNodeId);
    const pendingKey = this.getPendingCacheFillKey(node, requestKey, sourceNodeId);
    const readyAtMs = this.elapsedSimulationMs + originLatencyMs;
    const existing = this.pendingCacheFills.get(pendingKey);
    if (!existing || readyAtMs < existing.readyAtMs) {
      this.pendingCacheFills.set(pendingKey, {
        cacheNodeId: node.id,
        cacheKey,
        readyAtMs,
      });
    }
  }

  private flushReadyCacheFills(): void {
    for (const [pendingKey, pending] of this.pendingCacheFills) {
      if (pending.readyAtMs > this.elapsedSimulationMs) continue;
      const node = this.graph.nodes.find((candidate) => candidate.id === pending.cacheNodeId);
      if (node?.config.health !== 'down') {
        this.cacheModels.get(pending.cacheNodeId)?.put(
          pending.cacheKey,
          this.elapsedSimulationMs,
        );
      }
      this.pendingCacheFills.delete(pendingKey);
    }
  }

  private normalizeSeed(seed: number): number {
    const normalized = Math.floor(seed) >>> 0;
    return normalized || 1;
  }

  /** Mulberry32: small deterministic PRNG suitable for repeatable simulations. */
  private random(): number {
    let value = (this.randomState += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private generateRequestKey(
    distribution = this.config.requestKeyDistribution,
    requestedSize = this.config.requestKeySpaceSize,
  ): string {
    const size = Math.max(1, Math.floor(requestedSize || 100));
    if (distribution === 'custom') {
      const keys = (this.config.customRequestKeys || []).filter(
        (entry) => entry.key && Number.isFinite(entry.weight) && entry.weight > 0,
      );
      const totalWeight = keys.reduce((sum, entry) => sum + entry.weight, 0);
      if (totalWeight > 0) {
        let cursor = this.random() * totalWeight;
        for (const entry of keys) {
          cursor -= entry.weight;
          if (cursor <= 0) return entry.key;
        }
        return keys[keys.length - 1].key;
      }
    }

    if (distribution === 'zipfian') {
      let cumulative = this.zipfCumulativeWeights.get(size);
      if (!cumulative) {
        let sum = 0;
        cumulative = Array.from({ length: size }, (_, index) => {
          sum += 1 / (index + 1);
          return sum;
        });
        this.zipfCumulativeWeights.set(size, cumulative);
      }
      const cursor = this.random() * cumulative[cumulative.length - 1];
      let low = 0;
      let high = cumulative.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (cumulative[mid] < cursor) low = mid + 1;
        else high = mid;
      }
      return `resource:${low}`;
    }

    return `resource:${Math.floor(this.random() * size)}`;
  }

  private selectTrafficSources(sourceNodes: SimNode[], count: number): SimNode[] {
    if (sourceNodes.length <= 1) return Array.from({ length: count }, () => sourceNodes[0]);
    const weights = sourceNodes.map((node) => node.config.type === 'client'
      ? Math.max(0, node.config.requestRateQps)
      : 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const effectiveWeights = totalWeight > 0 ? weights : weights.map(() => 1);
    const effectiveTotal = effectiveWeights.reduce((sum, weight) => sum + weight, 0);
    const selected: SimNode[] = [];

    for (let requestIndex = 0; requestIndex < count; requestIndex++) {
      let selectedIndex = 0;
      let selectedCredit = Number.NEGATIVE_INFINITY;
      sourceNodes.forEach((node, index) => {
        const credit = (this.clientSelectionCredits.get(node.id) || 0) + effectiveWeights[index];
        this.clientSelectionCredits.set(node.id, credit);
        if (credit > selectedCredit) {
          selectedCredit = credit;
          selectedIndex = index;
        }
      });
      const selectedNode = sourceNodes[selectedIndex];
      this.clientSelectionCredits.set(
        selectedNode.id,
        (this.clientSelectionCredits.get(selectedNode.id) || 0) - effectiveTotal,
      );
      selected.push(selectedNode);
    }
    return selected;
  }

  public getMetricsSnapshot(): OverallMetrics {
    const latencies = this.completedRequests
      .filter((r) => r.status === 'success')
      .map((r) => r.totalLatencyMs)
      .sort((a, b) => a - b);

    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
    const avg =
      latencies.length > 0
        ? latencies.reduce((acc, l) => acc + l, 0) / latencies.length
        : 0;

    let totalHits = 0;
    let totalMisses = 0;
    let totalBypasses = 0;
    let totalCoalescedRequests = 0;
    let totalProducerAccepted = 0;
    let totalProducerRejected = 0;
    let totalConsumerSucceeded = 0;
    let totalConsumerFailed = 0;
    let totalMessageRetries = 0;
    let totalMessagesDropped = 0;
    let totalMessagesExpired = 0;
    let totalDeadLettered = 0;
    const componentMetrics: Record<string, ComponentMetricSnapshot> = {};

    let busiestNodeId: string | undefined;
    let maxNodeReqs = 0;
    let slowestNodeId: string | undefined;
    let maxAvgLat = 0;

    this.graph.nodes.forEach((n) => {
      const stats = this.nodeStats[n.id] || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        latencies: [],
        hits: 0,
        misses: 0,
        bypasses: 0,
        coalescedRequests: 0,
        queueDepth: 0,
      };

      totalHits += stats.hits;
      totalMisses += stats.misses;
      totalBypasses += stats.bypasses;
      totalCoalescedRequests += stats.coalescedRequests;

      const nodeAvgLat =
        stats.latencies.length > 0
          ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
          : 0;

      const sortedNodeLat = [...stats.latencies].sort((a, b) => a - b);
      const nodeP95 =
        sortedNodeLat.length > 0
          ? sortedNodeLat[Math.floor(sortedNodeLat.length * 0.95)]
          : 0;

      const nodeErrorRate =
        stats.totalRequests > 0
          ? (stats.failedRequests / stats.totalRequests) * 100
          : 0;

      const totalCacheLookups = stats.hits + stats.misses;
      const nodeCacheRatio =
        totalCacheLookups > 0 ? (stats.hits / totalCacheLookups) * 100 : 0;

      const nodeQps = stats.totalRequests > 0 ? Math.round(stats.totalRequests / Math.max(1, this.elapsedSimulationMs / 1000)) : 0;
      const ratedMaxQps = Math.max(10, n.config.maxThroughputQps || 5000);
      const messagingMetrics = this.queueModels.get(n.id)?.getMetrics(this.elapsedSimulationMs);
      const appMetrics = this.appServerModels.get(n.id)?.getMetrics(this.elapsedSimulationMs);
      const workerMetrics = this.workerModels.get(n.id)?.getMetrics();
      const serverlessMetrics = this.serverlessModels.get(n.id)?.getMetrics(this.elapsedSimulationMs);
      const loadBalancerMetrics = this.lbRouters.get(n.id)?.getMetrics();
      const apiGatewayMetrics = this.apiGatewayModels.get(n.id)?.getMetrics();
      const dnsMetrics = this.dnsModels.get(n.id)?.getMetrics();
      const proxyMetrics = this.reverseProxyModels.get(n.id)?.getMetrics(this.elapsedSimulationMs);
      const dbMetrics = this.dbModels.get(n.id)?.getMetrics();
      const noSqlMetrics = this.noSqlModels.get(n.id)?.getMetrics();
      const objectStorageMetrics = this.objectStorageModels.get(n.id)?.getMetrics();
      const searchMetrics = this.searchIndexModels.get(n.id)?.getMetrics();
      const graphDbMetrics = this.graphDbModels.get(n.id)?.getMetrics();
      const timeSeriesDbMetrics = this.timeSeriesDbModels.get(n.id)?.getMetrics();
      const cdnMetrics = this.cdnOriginMetrics.get(n.id);
      const wafMetrics = this.wafMetrics.get(n.id);
      const loadBalancerActiveConnections = n.config.type === 'load_balancer'
        ? Object.values(this.getLoadBalancerActiveConnections(
            n.id,
            this.graph.edges
              .filter((edge) => edge.source === n.id && getEdgePurpose(edge.data) === 'request' && !edge.data?.isCut)
              .map((edge) => edge.target),
            this.elapsedSimulationMs,
          )).reduce((sum, value) => sum + value, 0)
        : undefined;
      if (messagingMetrics) {
        totalProducerAccepted += messagingMetrics.producerAccepted;
        totalProducerRejected += messagingMetrics.producerRejected;
        totalConsumerSucceeded += messagingMetrics.consumerSucceeded;
        totalConsumerFailed += messagingMetrics.consumerFailed;
        totalMessageRetries += messagingMetrics.retries;
        totalMessagesDropped += messagingMetrics.dropped;
        totalMessagesExpired += messagingMetrics.expired;
        totalDeadLettered += messagingMetrics.deadLettered;
      }

      componentMetrics[n.id] = {
        nodeId: n.id,
        nodeName: n.config.name,
        nodeType: n.config.type,
        qps: nodeQps,
        avgLatencyMs: Math.round(nodeAvgLat * 10) / 10,
        p95LatencyMs: Math.round(nodeP95 * 10) / 10,
        errorRatePercent: Math.round(nodeErrorRate * 10) / 10,
        activeConnections: appMetrics?.activeConnections ?? workerMetrics?.busyWorkers ?? serverlessMetrics?.activeInvocations ?? proxyMetrics?.activeConnections ?? loadBalancerActiveConnections ?? (n.config.type === 'sql_db' ? this.dbModels.get(n.id)?.getActiveConnections() : undefined) ?? (this.activeConnections[n.id] || 0),
        queueDepth: appMetrics?.queuedRequests ?? workerMetrics?.queuedWork ?? serverlessMetrics?.queuedInvocations ?? dbMetrics?.queuedConnections ?? stats.queueDepth,
        cacheHitRatioPercent: Math.round(nodeCacheRatio * 10) / 10,
        utilizationPercent: appMetrics?.cpuUtilizationPercent ?? workerMetrics?.utilizationPercent ?? serverlessMetrics?.utilizationPercent ?? Math.min(100, Math.round((nodeQps / ratedMaxQps) * 100)),
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
        cacheHits: stats.hits,
        cacheMisses: stats.misses,
        cacheBypasses: stats.bypasses,
        cacheCoalescedRequests: stats.coalescedRequests,
        producerAccepted: messagingMetrics?.producerAccepted,
        producerRejected: messagingMetrics?.producerRejected,
        consumerSucceeded: messagingMetrics?.consumerSucceeded,
        consumerFailed: messagingMetrics?.consumerFailed,
        messageRetries: messagingMetrics?.retries,
        messageQueueAgeMs: messagingMetrics?.queueAgeMs,
        messagesDropped: messagingMetrics?.dropped,
        messagesExpired: messagingMetrics?.expired,
        deadLettered: messagingMetrics?.deadLettered,
        cpuUtilizationPercent: appMetrics?.cpuUtilizationPercent,
        busyWorkers: workerMetrics?.busyWorkers,
        queuedWork: workerMetrics?.queuedWork,
        workerProcessingLatencyMs: workerMetrics?.processingLatencyMs,
        workerRetries: workerMetrics?.retriesScheduled,
        coldStarts: serverlessMetrics?.coldStarts,
        warmStarts: serverlessMetrics?.warmStarts,
        serverlessTimeouts: serverlessMetrics?.timeouts,
        coldStartProbabilityPercent: serverlessMetrics?.coldStartProbabilityPercent,
        serverlessThrottles: serverlessMetrics?.throttles,
        serverlessInvocationFailures: serverlessMetrics?.invocationFailures,
        serverlessDownstreamFailures: serverlessMetrics?.downstreamFailures,
        loadBalancerUnavailableFailures: loadBalancerMetrics?.unavailableTargetFailures,
        loadBalancerDistributionSkewPercent: loadBalancerMetrics?.distributionSkewPercent,
        loadBalancerUnhealthyTargets: this.loadBalancerUnhealthyTargets.get(n.id),
        apiGatewayThrottles: apiGatewayMetrics?.throttles,
        apiGatewayTimeouts: apiGatewayMetrics?.timeouts,
        apiGatewayOpenCircuitRejections: apiGatewayMetrics?.openCircuitRejections,
        apiGatewayCircuitState: apiGatewayMetrics?.circuitState,
        cdnOriginOffloadedRequests: n.config.type === 'cdn' ? stats.hits : undefined,
        cdnOriginFetches: cdnMetrics?.fetches,
        cdnOriginFetchLatencyMs: cdnMetrics && cdnMetrics.fetches > 0 ? Math.round((cdnMetrics.latencyMs / cdnMetrics.fetches) * 10) / 10 : undefined,
        cdnOriginEgressKb: cdnMetrics?.egressKb,
        dnsCacheHits: dnsMetrics?.hits,
        dnsCacheMisses: dnsMetrics?.misses,
        dnsResolutionFailures: dnsMetrics?.failures,
        wafBlockedRequests: wafMetrics?.blocked,
        wafInfrastructureFailures: wafMetrics?.infrastructureFailures,
        reverseProxyRejectedConnections: proxyMetrics?.rejected,
        reverseProxyCompressedKbSaved: proxyMetrics ? Math.round(proxyMetrics.compressedKbSaved * 10) / 10 : undefined,
        reverseProxyBackpressureMs: proxyMetrics ? Math.round(proxyMetrics.backpressureMs * 10) / 10 : undefined,
        sqlReads: n.config.type === 'sql_db' ? dbMetrics?.reads : undefined,
        sqlWrites: n.config.type === 'sql_db' ? dbMetrics?.writes : undefined,
        sqlPrimaryQueries: n.config.type === 'sql_db' ? dbMetrics?.primaryQueries : undefined,
        sqlReplicaQueries: n.config.type === 'sql_db' ? dbMetrics?.replicaQueries : undefined,
        sqlConnectionWaits: n.config.type === 'sql_db' ? dbMetrics?.connectionWaits : undefined,
        sqlConnectionRejections: n.config.type === 'sql_db' ? dbMetrics?.connectionRejections : undefined,
        sqlConnectionWaitMs: n.config.type === 'sql_db' ? Math.round((dbMetrics?.connectionWaitMs || 0) * 10) / 10 : undefined,
        sqlReplicationLagMs: n.config.type === 'sql_db' ? dbMetrics?.replicationLagMs : undefined,
        sqlFailovers: n.config.type === 'sql_db' ? dbMetrics?.failovers : undefined,
        sqlHotPartitionPercent: n.config.type === 'sql_db' ? Math.round((dbMetrics?.hotPartitionPercent || 0) * 10) / 10 : undefined,
        nosqlReads: noSqlMetrics?.reads,
        nosqlWrites: noSqlMetrics?.writes,
        nosqlReadQuorum: noSqlMetrics?.readQuorum,
        nosqlWriteQuorum: noSqlMetrics?.writeQuorum,
        nosqlReplicationLagMs: noSqlMetrics?.replicationLagMs,
        nosqlHotPartitionPercent: noSqlMetrics ? Math.round(noSqlMetrics.hotPartitionPercent * 10) / 10 : undefined,
        objectStorageRequestLatencyMs: objectStorageMetrics ? Math.round(objectStorageMetrics.requestLatencyMs * 10) / 10 : undefined,
        objectStorageTransferLatencyMs: objectStorageMetrics ? Math.round(objectStorageMetrics.transferLatencyMs * 10) / 10 : undefined,
        objectStorageTransferredKb: objectStorageMetrics?.transferredKb,
        searchQueries: searchMetrics?.queries,
        searchIndexWrites: searchMetrics?.indexWrites,
        searchShardImbalancePercent: searchMetrics ? Math.round(searchMetrics.shardImbalancePercent * 10) / 10 : undefined,
        graphTraversalDepth: graphDbMetrics ? Math.round(graphDbMetrics.averageDepth * 10) / 10 : undefined,
        graphDepthLimitedQueries: graphDbMetrics?.depthLimitedQueries,
        graphEffectiveCapacityQps: graphDbMetrics?.effectiveCapacityQps,
        graphCapacityRejectedQueries: graphDbMetrics?.capacityRejectedQueries,
        timeSeriesAcceptedWrites: timeSeriesDbMetrics?.acceptedWrites,
        timeSeriesRejectedWrites: timeSeriesDbMetrics?.rejectedWrites,
        timeSeriesQueries: timeSeriesDbMetrics?.queries,
        timeSeriesRetentionDays: timeSeriesDbMetrics?.retentionDays,
      };

      if (stats.totalRequests > maxNodeReqs) {
        maxNodeReqs = stats.totalRequests;
        busiestNodeId = n.id;
      }
      if (nodeAvgLat > maxAvgLat) {
        maxAvgLat = nodeAvgLat;
        slowestNodeId = n.id;
      }
    });

    const overallErrorRate =
      this.totalSent > 0 ? (this.totalFailed / this.totalSent) * 100 : 0;
    const totalLookups = totalHits + totalMisses;
    const overallCacheHit =
      totalLookups > 0 ? (totalHits / totalLookups) * 100 : 0;

    return {
      totalRequestsSent: this.totalSent,
      totalRequestsSuccess: this.totalSuccess,
      totalRequestsFailed: this.totalFailed,
      currentQps: this.getCurrentQps(this.elapsedSimulationMs / 1000),
      avgEndToEndLatencyMs: Math.round(avg * 10) / 10,
      p50LatencyMs: Math.round(p50 * 10) / 10,
      p95LatencyMs: Math.round(p95 * 10) / 10,
      p99LatencyMs: Math.round(p99 * 10) / 10,
      overallErrorRatePercent: Math.round(overallErrorRate * 10) / 10,
      overallCacheHitRatioPercent: Math.round(overallCacheHit * 10) / 10,
      totalCacheHits: totalHits,
      totalCacheMisses: totalMisses,
      totalCacheBypasses: totalBypasses,
      totalCacheCoalescedRequests: totalCoalescedRequests,
      totalProducerAccepted,
      totalProducerRejected,
      totalConsumerSucceeded,
      totalConsumerFailed,
      totalMessageRetries,
      totalMessagesDropped,
      totalMessagesExpired,
      totalDeadLettered,
      busiestNodeId,
      slowestNodeId,
      timeSeries: this.timeSeries,
      componentMetrics,
    };
  }
}
