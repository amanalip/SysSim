import { AnyComponentConfig, BottleneckIssue, OverallMetrics, ProtocolEdgeData } from '../../model/types';
import { getEdgePurpose } from '../../model/edge-semantics';
import { effectiveCapacityQps } from './capacity';

interface GraphNode { id: string; data: { config: AnyComponentConfig } }
interface GraphEdge { id: string; source: string; target: string; data: ProtocolEdgeData }

const ASYNC_TYPES = new Set(['message_queue', 'task_queue', 'pubsub', 'event_bus']);
const CACHE_TYPES = new Set(['redis_cache', 'local_cache', 'cdn_cache', 'browser_cache', 'cdn']);
const DB_TYPES = new Set(['sql_db', 'nosql_db']);
const IMPACT = { critical: 80, warning: 45 } as const;

function activeProductionEdges(edges: GraphEdge[]): GraphEdge[] {
  return edges.filter((edge) => !edge.data?.isCut && !['replication', 'observability'].includes(getEdgePurpose(edge.data)));
}

function graphContext(nodes: GraphNode[], edges: GraphEdge[]) {
  const active = activeProductionEdges(edges);
  const outgoing = new Map<string, GraphEdge[]>();
  const incoming = new Map<string, number>();
  nodes.forEach((node) => { outgoing.set(node.id, []); incoming.set(node.id, 0); });
  active.forEach((edge) => {
    outgoing.get(edge.source)?.push(edge);
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
  });
  const explicitSources = nodes.filter((node) => node.data.config.type === 'client');
  const sources = explicitSources.length ? explicitSources : nodes.filter((node) => (incoming.get(node.id) || 0) === 0);
  const reachable = new Set<string>();
  const parent = new Map<string, string>();
  const queue = sources.map((node) => node.id);
  queue.forEach((id) => reachable.add(id));
  while (queue.length) {
    const id = queue.shift()!;
    for (const edge of outgoing.get(id) || []) {
      if (reachable.has(edge.target)) continue;
      reachable.add(edge.target);
      parent.set(edge.target, id);
      queue.push(edge.target);
    }
  }
  const pathTo = (target: string) => {
    const path = [target];
    while (parent.has(path[0])) path.unshift(parent.get(path[0])!);
    return path;
  };
  const trafficShare = new Map<string, number>();
  const sourceShare = 100 / Math.max(1, sources.length);
  for (const source of sources) {
    const sourceReachable = new Set([source.id]);
    const pending = [source.id];
    while (pending.length) {
      const current = pending.shift()!;
      for (const edge of outgoing.get(current) || []) {
        if (ASYNC_TYPES.has(nodes.find((node) => node.id === edge.target)?.data.config.type || '') || sourceReachable.has(edge.target)) continue;
        sourceReachable.add(edge.target);
        pending.push(edge.target);
      }
    }
    sourceReachable.forEach((id) => trafficShare.set(id, Math.min(100, (trafficShare.get(id) || 0) + sourceShare)));
  }
  return { active, outgoing, sources, reachable, pathTo, trafficShare };
}

function pathNames(path: string[], nodes: GraphNode[]): string {
  return path.map((id) => nodes.find((node) => node.id === id)?.data.config.name || id).join(' → ');
}

function confidenceFor(metrics: OverallMetrics | undefined, nodeId: string): 'low' | 'medium' | 'high' {
  const samples = metrics?.componentMetrics[nodeId]?.totalRequests || 0;
  return samples >= 1_000 ? 'high' : samples >= 100 ? 'medium' : 'low';
}

export function detectBottlenecks(nodes: GraphNode[], edges: GraphEdge[], metrics?: OverallMetrics): BottleneckIssue[] {
  if (!nodes.length) return [];
  const context = graphContext(nodes, edges);
  const issues: BottleneckIssue[] = [];
  const add = (issue: BottleneckIssue) => issues.push({
    ...issue,
    affectedTrafficPercent: Math.round((context.trafficShare.get(issue.nodeId) || 0) * 10) / 10,
    confidence: issue.confidence || confidenceFor(metrics, issue.nodeId),
    impactScore: issue.impactScore || IMPACT[issue.severity],
  });

  for (const node of nodes) {
    if (!context.reachable.has(node.id) || context.sources.some((source) => source.id === node.id)) continue;
    const config = node.data.config;
    const replicas = config.type === 'sql_db'
      ? Math.max(Number(config.replicas), Number(config.readReplicasCount) + 1)
      : 'replicas' in config ? Number(config.replicas) : 1;
    if (replicas > 1) continue;
    const reachableWithout = new Set(context.sources.map((source) => source.id));
    const queue = [...reachableWithout];
    while (queue.length) {
      const id = queue.shift()!;
      for (const edge of context.outgoing.get(id) || []) {
        if (edge.target === node.id || edge.source === node.id || reachableWithout.has(edge.target)) continue;
        reachableWithout.add(edge.target);
        queue.push(edge.target);
      }
    }
    const disconnected = [...context.reachable].filter((id) => id !== node.id && !reachableWithout.has(id));
    const isTerminalDependency = (context.outgoing.get(node.id) || []).length === 0;
    if (!disconnected.length && !isTerminalDependency) continue;
    const path = context.pathTo(node.id);
    const qps = metrics?.componentMetrics[node.id]?.qps || 0;
    const databaseUnderCriticalLoad = DB_TYPES.has(config.type) && qps > 2_000;
    add({ id: `${DB_TYPES.has(config.type) ? 'spof_db' : 'spof'}_${node.id}`, type: 'spof', severity: databaseUnderCriticalLoad || disconnected.length > 2 ? 'critical' : 'warning', nodeId: node.id,
      nodeName: config.name, title: databaseUnderCriticalLoad ? 'Critical Database Contention SPOF' : 'Reachable Path Single Point of Failure',
      description: `Removing '${config.name}' makes ${disconnected.length + 1} reachable component(s) unavailable${qps ? ` at ${qps} QPS` : ''}. Trigger path: ${pathNames(path, nodes)}.`,
      suggestedFix: 'Add a separately routable redundant node or failover path; replica count alone is insufficient without routing.',
      triggerPath: path, impactScore: Math.min(100, 60 + disconnected.length * 5) });
  }

  const readHeavy = context.sources.some((source) => source.data.config.type === 'client' && (source.data.config.readPercentage ?? 80) >= 50);
  if (readHeavy) for (const db of nodes.filter((node) => DB_TYPES.has(node.data.config.type) && context.reachable.has(node.id))) {
    const path = context.pathTo(db.id);
    if (path.some((id) => CACHE_TYPES.has(nodes.find((node) => node.id === id)?.data.config.type || ''))) continue;
    add({ id: `missing_cache_${db.id}`, type: 'missing_cache', severity: 'warning', nodeId: db.id, nodeName: db.data.config.name,
      title: 'Read-Heavy Database Path Has No Cache', description: `A read-heavy source reaches '${db.data.config.name}' without a cache. Trigger path: ${pathNames(path, nodes)}.`,
      suggestedFix: 'Add a cache-aside layer on this read path and validate invalidation requirements.', triggerPath: path });
  }

  const visit = (id: string, path: string[]): void => {
    if (path.includes(id) || path.length > 12) return;
    const nextPath = [...path, id];
    const node = nodes.find((candidate) => candidate.id === id);
    if (!node) return;
    if (nextPath.length >= 5 && !nextPath.some((nodeId) => ASYNC_TYPES.has(nodes.find((candidate) => candidate.id === nodeId)?.data.config.type || ''))) {
      add({ id: `sync_chain_${id}`, type: 'synchronous_chain', severity: 'warning', nodeId: id, nodeName: node.data.config.name,
        title: 'Long Synchronous Request Chain', description: `Request latency compounds across ${nextPath.length} synchronous components: ${pathNames(nextPath, nodes)}.`,
        suggestedFix: 'Move non-critical work behind an async edge or shorten the synchronous dependency chain.', triggerPath: nextPath });
      return;
    }
    for (const edge of context.outgoing.get(id) || []) {
      if (['request', 'fallback'].includes(getEdgePurpose(edge.data))) visit(edge.target, nextPath);
    }
  };
  context.sources.forEach((source) => visit(source.id, []));

  for (const metric of Object.values(metrics?.componentMetrics || {})) {
    const node = nodes.find((candidate) => candidate.id === metric.nodeId);
    if (!node || !context.reachable.has(node.id)) continue;
    const path = context.pathTo(node.id);
    const maxCapacity = effectiveCapacityQps(node.data.config);
    if (maxCapacity > 0 && metric.qps > maxCapacity * 0.9) add({ id: `overload_${node.id}`, type: 'capacity_overload', severity: 'critical', nodeId: node.id,
      nodeName: metric.nodeName, title: 'Component Near Max Capacity', description: `'${metric.nodeName}' is at ${metric.qps}/${maxCapacity} QPS on path ${pathNames(path, nodes)}.`,
      suggestedFix: 'Increase effective capacity or reduce offered load on this path.', metricValue: `${metric.qps} / ${maxCapacity} QPS`, triggerPath: path, impactScore: 90 });
    if (metric.errorRatePercent >= 10) add({ id: `high_error_${node.id}`, type: 'high_error_rate', severity: metric.errorRatePercent >= 20 ? 'critical' : 'warning', nodeId: node.id,
      nodeName: metric.nodeName, title: 'High Component Error Rate', description: `'${metric.nodeName}' reports ${metric.errorRatePercent}% errors on path ${pathNames(path, nodes)}.`,
      suggestedFix: 'Inspect failed traces and downstream health, then address the dominant error source.', metricValue: `${metric.errorRatePercent}% errors`, triggerPath: path,
      impactScore: metric.errorRatePercent >= 20 ? 90 : 60 });
    const hot = metric.sqlHotPartitionPercent ?? metric.nosqlHotPartitionPercent;
    if ((hot || 0) >= 25) add({ id: `hot_partition_${node.id}`, type: 'hot_partition', severity: (hot || 0) >= 50 ? 'critical' : 'warning', nodeId: node.id,
      nodeName: metric.nodeName, title: 'Hot Partition Pressure', description: `'${metric.nodeName}' reports ${hot}% hot-partition overhead on ${pathNames(path, nodes)}.`,
      suggestedFix: 'Revisit partition keys, shard distribution, and hot-key mitigation.', metricValue: `${hot}% overhead`, triggerPath: path });
    if ((metric.loadBalancerDistributionSkewPercent || 0) >= 25) add({ id: `unbalanced_${node.id}`, type: 'unbalanced_load', severity: (metric.loadBalancerDistributionSkewPercent || 0) >= 50 ? 'critical' : 'warning', nodeId: node.id,
      nodeName: metric.nodeName, title: 'Unbalanced Load Distribution', description: `'${metric.nodeName}' has ${metric.loadBalancerDistributionSkewPercent}% distribution skew on ${pathNames(path, nodes)}.`,
      suggestedFix: 'Review routing weights, health eligibility, and sticky-session keys.', metricValue: `${metric.loadBalancerDistributionSkewPercent}% skew`, triggerPath: path });
    const queueLimit = 'maxDepth' in node.data.config ? node.data.config.maxDepth : 'connectionQueueLimit' in node.data.config ? node.data.config.connectionQueueLimit : 0;
    if (queueLimit > 0 && metric.queueDepth >= queueLimit * 0.8) add({ id: `queue_${node.id}`, type: 'queue_overflow', severity: metric.queueDepth >= queueLimit ? 'critical' : 'warning', nodeId: node.id,
      nodeName: metric.nodeName, title: 'Queue Near Overflow', description: `'${metric.nodeName}' queue depth is ${metric.queueDepth}/${queueLimit} on ${pathNames(path, nodes)}.`,
      suggestedFix: 'Increase consumer capacity, apply backpressure, or safely increase the queue bound.', metricValue: `${metric.queueDepth} / ${queueLimit}`, triggerPath: path });
  }

  const deduplicated = new Map<string, BottleneckIssue>();
  for (const issue of issues) {
    const key = `${issue.type}:${issue.nodeId}`;
    const existing = deduplicated.get(key);
    if (!existing || (issue.impactScore || 0) > (existing.impactScore || 0)) deduplicated.set(key, issue);
  }
  return [...deduplicated.values()].sort((a, b) =>
    (b.impactScore || 0) - (a.impactScore || 0) || (b.affectedTrafficPercent || 0) - (a.affectedTrafficPercent || 0));
}
