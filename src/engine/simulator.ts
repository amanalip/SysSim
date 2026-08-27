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
import { QueueModel } from './components/queue-model';
import { DatabaseModel } from './components/db-model';

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

export class SysSimEngine {
  private graph: SimGraph = { nodes: [], edges: [] };
  private config: TrafficConfig = {
    pattern: 'steady',
    baseQps: 500,
    burstMultiplier: 3,
    rampDurationSec: 30,
    spikeFrequencySec: 10,
  };
  private speedMultiplier = 1;
  private state: SimulationState = 'idle';

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
      queueDepth: number;
    }
  > = {};
  private timeSeries: TimeSeriesDataPoint[] = [];
  private fractionalRequestAccumulator = 0;

  // Component model instances cache
  private lbRouters: Map<string, LoadBalancerRouter> = new Map();
  private cacheModels: Map<string, CacheModel> = new Map();
  private rateLimiters: Map<string, RateLimiterModel> = new Map();
  private queueModels: Map<string, QueueModel> = new Map();
  private dbModels: Map<string, DatabaseModel> = new Map();
  private activeConnections: Record<string, number> = {};

  constructor(graph?: SimGraph, config?: TrafficConfig) {
    if (graph) this.setGraph(graph);
    if (config) this.setConfig(config);
  }

  public setGraph(graph: SimGraph): void {
    this.graph = graph;
    this.lbRouters.clear();
    this.cacheModels.clear();
    this.rateLimiters.clear();
    this.queueModels.clear();
    this.dbModels.clear();

    const validNodeIds = new Set(graph.nodes.map((n) => n.id));
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
        this.lbRouters.set(
          n.id,
          new LoadBalancerRouter(n.config.algorithm || 'round_robin', outgoing)
        );
      } else if (
        n.config.type === 'redis_cache' ||
        n.config.type === 'local_cache' ||
        n.config.type === 'cdn_cache' ||
        n.config.type === 'browser_cache'
      ) {
        const hitRatio =
          n.config.hitRatioPercent !== undefined ? n.config.hitRatioPercent : 80;
        const eviction = (n.config as any).evictionPolicy || 'LRU';
        this.cacheModels.set(
          n.id,
          new CacheModel(1000, eviction, hitRatio)
        );
      } else if (n.config.type === 'rate_limiter') {
        this.rateLimiters.set(
          n.id,
          new RateLimiterModel(
            n.config.algorithm || 'token_bucket',
            n.config.limitQps || 1000,
            n.config.windowSizeSec || 1
          )
        );
      } else if (n.config.type === 'message_queue') {
        this.queueModels.set(
          n.id,
          new QueueModel(
            n.config.maxDepth || 50000,
            n.config.consumerThroughputPerSec || 2000,
            n.config.partitions || 8
          )
        );
      } else if (n.config.type === 'sql_db' || n.config.type === 'nosql_db') {
        const replicas = (n.config as any).readReplicasCount || 0;
        this.dbModels.set(
          n.id,
          new DatabaseModel(
            n.config.baseLatencyMs || 20,
            (n.config as any).maxConnections || 500,
            replicas
          )
        );
      }
    });
  }

  public setConfig(config: Partial<TrafficConfig>): void {
    this.config = { ...this.config, ...config };
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
    this.completedRequests = [];
    this.activeRequests = [];
    this.totalSent = 0;
    this.totalSuccess = 0;
    this.totalFailed = 0;
    this.timeSeries = [];
    this.activeConnections = {};
    this.rateLimiters.forEach((rl) => rl.reset());
    this.queueModels.forEach((q) => q.reset());
    this.dbModels.forEach((db) => db.reset());
    this.cacheModels.forEach((c) => c.reset());
    this.graph.nodes.forEach((n) => {
      this.nodeStats[n.id] = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        latencies: [],
        hits: 0,
        misses: 0,
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
    const elapsedSec = this.elapsedSimulationMs / 1000;

    // Drain queues and database connections
    this.queueModels.forEach((q) => q.drain(scaledDelta));
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
      for (let i = 0; i < requestsToGenerate; i++) {
        const source = sourceNodes[i % sourceNodes.length];
        const req = createSimRequest(source.id, this.elapsedSimulationMs);
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
    this.totalSent++;
    const result = this.traverseNode(req.sourceNodeId, req.id, 0, new Set());

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
    startTimeMs: number,
    visited: Set<string>,
    viaEdgePurpose?: EdgePurpose,
  ): TraversalResult {
    if (visited.has(nodeId)) {
      return {
        success: true,
        status: 'success',
        latencyMs: 0,
        hops: [],
        cacheMiss: false,
        usedAsync: false,
      };
    }

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

    const branchVisited = new Set(visited);
    branchVisited.add(nodeId);
    const nodeResult = this.processNode(node, requestId, startTimeMs, viaEdgePurpose);
    if (!nodeResult.success) return nodeResult;

    const outgoingEdges = this.graph.edges.filter(
      (edge) => edge.source === nodeId && !edge.data?.isCut,
    );
    const edgesByPurpose = (purpose: EdgePurpose) =>
      outgoingEdges.filter((edge) => getEdgePurpose(edge.data) === purpose);

    let latencyMs = nodeResult.latencyMs;
    const hops = [...nodeResult.hops];
    let usedAsync = false;
    let primaryFailure: TraversalResult | null = null;

    for (const edge of [
      ...edgesByPurpose('replication'),
      ...edgesByPurpose('observability'),
    ]) {
      this.traverseNode(edge.target, requestId, 0, branchVisited, getEdgePurpose(edge.data));
    }

    for (const edge of edgesByPurpose('async')) {
      const edgeLatency = this.getEdgeLatency(edge);
      const asyncBranch = this.traverseNode(
        edge.target,
        requestId,
        startTimeMs + latencyMs + edgeLatency,
        branchVisited,
        'async',
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

    if (!nodeResult.cacheMiss && !primaryFailure && requestEdges.length > 0) {
      const selectedRequestEdges =
        node.config.type === 'load_balancer'
          ? this.selectLoadBalancerEdge(node.id, requestId, requestEdges)
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
            startTimeMs + latencyMs + edgeLatency,
            branchVisited,
            'request',
          );
          latencyMs += edgeLatency + child.latencyMs;
          hops.push(...child.hops);
          usedAsync ||= child.usedAsync;
          if (!child.success) {
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
          fanoutStart + edgeLatency,
          branchVisited,
          'fanout',
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
    if (needsFallback && fallbackEdges.length > 0) {
      for (const edge of fallbackEdges) {
        const edgeLatency = this.getEdgeLatency(edge);
        const fallback = this.traverseNode(
          edge.target,
          requestId,
          startTimeMs + latencyMs + edgeLatency,
          branchVisited,
          'fallback',
        );
        latencyMs += edgeLatency + fallback.latencyMs;
        hops.push(...fallback.hops);
        usedAsync ||= fallback.usedAsync;
        if (fallback.success) {
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
            status: status === 'rate_limited' ? 'rejected' : 'error',
            info,
            viaEdgePurpose,
          },
        ],
        cacheMiss: false,
        usedAsync: false,
      } satisfies TraversalResult;
    };

    if (config.health === 'down') {
      return failure('error', 1, 'Component is down');
    }

    if (config.failureRatePercent && Math.random() * 100 < config.failureRatePercent) {
      return failure('error', 5, 'Simulated component fault');
    }

    let hopLatency = 5;
    let hopStatus: RequestHop['status'] = 'processed';
    let hopInfo: string | undefined;

    if (config.type === 'app_server') {
      const replicas = config.replicas || 1;
      hopLatency = Math.max(
        2,
        Math.round((config.processingLatencyMs || 15) / Math.sqrt(replicas)),
      );
    } else if (config.type === 'sql_db' || config.type === 'nosql_db') {
      const dbModel = this.dbModels.get(node.id);
      hopLatency = dbModel
        ? dbModel.executeQuery(Math.random() < 0.1).latencyMs
        : config.baseLatencyMs || 20;
    } else if (
      config.type === 'redis_cache' ||
      config.type === 'local_cache' ||
      config.type === 'cdn_cache' ||
      config.type === 'browser_cache'
    ) {
      const cacheModel = this.cacheModels.get(node.id);
      const cacheAccess = cacheModel
        ? cacheModel.access(requestId, this.elapsedSimulationMs)
        : { hit: Math.random() < 0.8, latencyMs: 2 };
      if (cacheAccess.hit) {
        hopLatency = cacheAccess.latencyMs;
        hopStatus = 'hit';
        hopInfo = 'Cache hit';
        stats.hits++;
      } else {
        hopLatency = 5;
        hopStatus = 'miss';
        hopInfo = 'Cache miss';
        stats.misses++;
      }
    } else if (config.type === 'rate_limiter') {
      const allowed = this.rateLimiters.get(node.id)?.allowRequest(this.elapsedSimulationMs) ?? true;
      if (!allowed) return failure('rate_limited', 1, 'Request rejected by rate limiter');
    } else if (config.type === 'message_queue') {
      const enqueue = this.queueModels.get(node.id)?.enqueue();
      if (enqueue) {
        stats.queueDepth = enqueue.depth;
        if (!enqueue.accepted) return failure('dropped', 4, 'Queue capacity exceeded');
      }
      hopLatency = 4;
      hopStatus = 'queued';
    } else if (config.type === 'auth_service') {
      hopLatency = Math.max(1, config.validationLatencyMs || 4);
    } else if (config.type === 'encryption_service') {
      hopLatency = Math.max(1, config.overheadLatencyMs || 3);
    } else if (config.type === 'serverless') {
      hopLatency = stats.totalRequests <= 1 ? config.coldStartLatencyMs || 25 : 5;
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
    requestId: string,
    requestEdges: SimEdge[],
  ): SimEdge[] {
    const target = this.lbRouters
      .get(nodeId)
      ?.selectTarget(requestId, this.activeConnections);
    if (!target) return [];
    const selected = requestEdges.find((edge) => edge.target === target);
    return selected ? [selected] : [];
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
        queueDepth: 0,
      };

      totalHits += stats.hits;
      totalMisses += stats.misses;

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

      componentMetrics[n.id] = {
        nodeId: n.id,
        nodeName: n.config.name,
        nodeType: n.config.type,
        qps: nodeQps,
        avgLatencyMs: Math.round(nodeAvgLat * 10) / 10,
        p95LatencyMs: Math.round(nodeP95 * 10) / 10,
        errorRatePercent: Math.round(nodeErrorRate * 10) / 10,
        activeConnections: this.activeConnections[n.id] || 0,
        queueDepth: stats.queueDepth,
        cacheHitRatioPercent: Math.round(nodeCacheRatio * 10) / 10,
        utilizationPercent: Math.min(100, Math.round((nodeQps / ratedMaxQps) * 100)),
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
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
      busiestNodeId,
      slowestNodeId,
      timeSeries: this.timeSeries,
      componentMetrics,
    };
  }
}
