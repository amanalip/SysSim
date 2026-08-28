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
  private queueModels: Map<string, QueueModel> = new Map();
  private dbModels: Map<string, DatabaseModel> = new Map();
  private activeConnections: Record<string, number> = {};
  private pendingCacheFills = new Map<string, PendingCacheFill>();

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
    this.pendingCacheFills.clear();

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
        const config = n.config;
        const isServerCache = config.type === 'redis_cache' || config.type === 'local_cache';
        const sizeMb = isServerCache ? config.sizeMb : config.type === 'browser_cache' ? 1 : 100;
        const entrySizeKb = isServerCache ? config.entrySizeKb || 1 : 1;
        const sizeLimit = Math.max(1, Math.floor((sizeMb * 1024) / entrySizeKb));
        const defaultTtlSec = config.type === 'redis_cache'
          ? 300
          : config.type === 'local_cache'
            ? 60
            : config.type === 'cdn_cache'
              ? 3600
              : 86400;
        const defaultReadLatencyMs = config.type === 'redis_cache'
          ? 2
          : config.type === 'local_cache'
            ? 0.5
            : config.type === 'cdn_cache'
              ? 8
              : 0.2;
        this.cacheModels.set(n.id, new CacheModel({
          sizeLimit,
          evictionPolicy: 'evictionPolicy' in config && config.evictionPolicy
            ? config.evictionPolicy
            : isServerCache ? 'LRU' : 'TTL',
          ttlMs: Math.max(1, Number(config.ttlSec) || defaultTtlSec) * 1000,
          readLatencyMs: Number.isFinite(config.readLatencyMs)
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
            replicas,
            () => this.random(),
          )
        );
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
    this.rateLimiters.forEach((rl) => rl.reset());
    this.queueModels.forEach((q) => q.reset());
    this.dbModels.forEach((db) => db.reset());
    this.cacheModels.forEach((c) => c.reset());
    this.pendingCacheFills.clear();
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
        const requestKey = this.generateRequestKey();
        const req = createSimRequest(
          source.id,
          this.elapsedSimulationMs,
          requestKey,
          this.requestSequence++,
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
            requestKey,
            sourceNodeId,
            startTimeMs + latencyMs + edgeLatency,
            branchVisited,
            'request',
            hopCount + 1,
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
    if (needsFallback && fallbackEdges.length > 0) {
      if (cacheNode && !nodeResult.success) {
        const stats = this.nodeStats[node.id];
        if (stats) stats.bypasses++;
        if (hops[0]) hops[0].info = 'Cache unavailable — bypassing to origin fallback';
      }
      for (const edge of fallbackEdges) {
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
      return failure(
        'error',
        1,
        this.isCacheNode(node) ? 'Cache unavailable' : 'Component is down',
      );
    }

    if (config.failureRatePercent && this.random() * 100 < config.failureRatePercent) {
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
        ? dbModel.executeQuery(this.random() < 0.1).latencyMs
        : config.baseLatencyMs || 20;
    } else if (
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
        hopInfo = 'Cache hit — served without origin';
        stats.hits++;
      } else {
        hopLatency = cacheAccess.latencyMs;
        hopStatus = 'miss';
        hopInfo = 'Cache miss — forwarding to origin fallback';
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

  private isCacheNode(node: SimNode): boolean {
    return ['redis_cache', 'local_cache', 'cdn_cache', 'browser_cache'].includes(node.config.type);
  }

  private getCacheKey(node: SimNode, requestKey: string, sourceNodeId: string): string {
    return node.config.type === 'browser_cache'
      ? `${sourceNodeId}:${requestKey}`
      : requestKey;
  }

  private isRequestCoalescingEnabled(node: SimNode): boolean {
    return this.isCacheNode(node) && 'requestCoalescingEnabled' in node.config
      ? node.config.requestCoalescingEnabled
      : node.config.type === 'cdn_cache' || node.config.type === 'browser_cache';
  }

  private getPendingCacheFillKey(node: SimNode, requestKey: string, sourceNodeId: string): string {
    return `${node.id}:${this.getCacheKey(node, requestKey, sourceNodeId)}`;
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

  private generateRequestKey(): string {
    const size = Math.max(1, Math.floor(this.config.requestKeySpaceSize || 100));
    if (this.config.requestKeyDistribution === 'custom') {
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

    if (this.config.requestKeyDistribution === 'zipfian') {
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
        cacheHits: stats.hits,
        cacheMisses: stats.misses,
        cacheBypasses: stats.bypasses,
        cacheCoalescedRequests: stats.coalescedRequests,
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
      busiestNodeId,
      slowestNodeId,
      timeSeries: this.timeSeries,
      componentMetrics,
    };
  }
}
