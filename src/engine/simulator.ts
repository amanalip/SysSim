import {
  AnyComponentConfig,
  ComponentMetricSnapshot,
  OverallMetrics,
  ProtocolEdgeData,
  SimRequest,
  SimulationState,
  TimeSeriesDataPoint,
  TrafficConfig,
} from '../model/types';
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
          .filter((e) => e.source === n.id && !e.data?.isCut)
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
    this.completedRequests = [];
    this.activeRequests = [];
    this.totalSent = 0;
    this.totalSuccess = 0;
    this.totalFailed = 0;
    this.timeSeries = [];
    this.activeConnections = {};
    this.nodeStats = {};
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

    // Drain queues
    this.queueModels.forEach((q) => q.drain(scaledDelta));

    // Determine current rate and how many requests to generate this tick
    const currentQps = this.getCurrentQps(elapsedSec);
    const requestsToGenerate = Math.max(1, Math.round((currentQps * scaledDelta) / 1000));

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
    let currentNodeId: string | null = req.sourceNodeId;
    let isSuccess = true;
    let totalLatency = 0;
    const visited = new Set<string>();

    while (currentNodeId) {
      if (visited.has(currentNodeId)) {
        // Break cycles
        break;
      }
      visited.add(currentNodeId);

      const node = this.graph.nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

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

      // Check health down
      if (config.health === 'down') {
        stats.failedRequests++;
        req.path.push({
          nodeId: node.id,
          nodeName: config.name,
          nodeType: config.type,
          enterTimeMs: totalLatency,
          exitTimeMs: totalLatency + 1,
          latencyMs: 1,
          status: 'error',
          info: 'Component is down',
        });
        isSuccess = false;
        req.status = 'error';
        req.color = '#f85149';
        break;
      }

      // Check failure rate
      if (
        config.failureRatePercent &&
        Math.random() * 100 < config.failureRatePercent
      ) {
        stats.failedRequests++;
        req.path.push({
          nodeId: node.id,
          nodeName: config.name,
          nodeType: config.type,
          enterTimeMs: totalLatency,
          exitTimeMs: totalLatency + 5,
          latencyMs: 5,
          status: 'error',
          info: 'Simulated component fault',
        });
        isSuccess = false;
        req.status = 'error';
        req.color = '#f85149';
        break;
      }

      // Model specific evaluations
      let hopLatency = 5;
      let hopStatus: 'hit' | 'miss' | 'processed' | 'rejected' | 'queued' | 'error' = 'processed';

      if (config.type === 'app_server') {
        const replicas = config.replicas || 1;
        hopLatency = Math.max(2, Math.round((config.processingLatencyMs || 15) / Math.sqrt(replicas)));
      } else if (config.type === 'sql_db' || config.type === 'nosql_db') {
        const dbModel = this.dbModels.get(node.id);
        if (dbModel) {
          const queryRes = dbModel.executeQuery(Math.random() < 0.1);
          hopLatency = queryRes.latencyMs;
        } else {
          hopLatency = config.baseLatencyMs || 20;
        }
      } else if (
        config.type === 'redis_cache' ||
        config.type === 'local_cache' ||
        config.type === 'cdn_cache' ||
        config.type === 'browser_cache'
      ) {
        const cacheModel = this.cacheModels.get(node.id);
        const cacheAccess = cacheModel
          ? cacheModel.access(req.id, this.elapsedSimulationMs)
          : { hit: Math.random() < 0.8, latencyMs: 2 };

        if (cacheAccess.hit) {
          hopLatency = cacheAccess.latencyMs;
          hopStatus = 'hit';
          stats.hits++;
        } else {
          hopLatency = 5;
          hopStatus = 'miss';
          stats.misses++;
        }
      } else if (config.type === 'rate_limiter') {
        const rlModel = this.rateLimiters.get(node.id);
        const allowed = rlModel ? rlModel.allowRequest(this.elapsedSimulationMs) : true;
        if (!allowed) {
          hopStatus = 'rejected';
          isSuccess = false;
          req.status = 'rate_limited';
          req.color = '#d29922';
          stats.failedRequests++;
          break;
        }
      } else if (config.type === 'message_queue') {
        const qModel = this.queueModels.get(node.id);
        if (qModel) {
          const enq = qModel.enqueue();
          stats.queueDepth = enq.depth;
          if (!enq.accepted) {
            hopStatus = 'error';
            isSuccess = false;
            req.status = 'dropped';
            req.color = '#f85149';
            stats.failedRequests++;
            break;
          }
        }
        hopLatency = 4;
        hopStatus = 'queued';
      }

      totalLatency += hopLatency;
      stats.latencies.push(hopLatency);
      if (stats.latencies.length > 500) stats.latencies.shift();
      stats.successfulRequests++;

      req.path.push({
        nodeId: node.id,
        nodeName: config.name,
        nodeType: config.type,
        enterTimeMs: totalLatency - hopLatency,
        exitTimeMs: totalLatency,
        latencyMs: hopLatency,
        status: hopStatus,
      });

      // Route downstream
      const outgoingEdges = this.graph.edges.filter(
        (e) => e.source === currentNodeId && !e.data?.isCut
      );

      if (outgoingEdges.length === 0) {
        currentNodeId = null;
      } else if (outgoingEdges.length === 1) {
        currentNodeId = outgoingEdges[0].target;
      } else {
        if (config.type === 'load_balancer') {
          const lbRouter = this.lbRouters.get(node.id);
          const nextTarget = lbRouter
            ? lbRouter.selectTarget(req.id, this.activeConnections)
            : outgoingEdges[0].target;
          currentNodeId = nextTarget;
        } else {
          currentNodeId = outgoingEdges[0].target;
        }
      }
    }

    req.totalLatencyMs = totalLatency;
    if (isSuccess) {
      this.totalSuccess++;
      req.status = 'success';
      req.color = '#3fb950';
    } else {
      this.totalFailed++;
    }

    this.completedRequests.push(req);
    if (this.completedRequests.length > 1000) {
      this.completedRequests.shift();
    }
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

      componentMetrics[n.id] = {
        nodeId: n.id,
        nodeName: n.config.name,
        nodeType: n.config.type,
        qps: stats.totalRequests > 0 ? Math.round(stats.totalRequests / Math.max(1, this.elapsedSimulationMs / 1000)) : 0,
        avgLatencyMs: Math.round(nodeAvgLat * 10) / 10,
        p95LatencyMs: Math.round(nodeP95 * 10) / 10,
        errorRatePercent: Math.round(nodeErrorRate * 10) / 10,
        activeConnections: Math.min(stats.totalRequests, (n.config as any).maxConnections || 100),
        queueDepth: stats.queueDepth,
        cacheHitRatioPercent: Math.round(nodeCacheRatio * 10) / 10,
        utilizationPercent: Math.min(100, Math.round((stats.totalRequests / Math.max(10, (n.config.maxThroughputQps || 5000))) * 100)),
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
