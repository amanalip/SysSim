import { BottleneckIssue, OverallMetrics } from '../../model/types';
import { effectiveCapacityQps } from './capacity';
import { CanvasEdge, CanvasNode } from '../../store/use-store';

export function detectBottlenecks(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  metrics?: OverallMetrics
): BottleneckIssue[] {
  const issues: BottleneckIssue[] = [];

  if (nodes.length === 0) return issues;

  // 1. Single Point of Failure (SPOF) Detection
  // Nodes that are critical (app_server, database) with replicas === 1 and on traffic path
  nodes.forEach((node) => {
    const config = node.data.config;
    if (config.type === 'app_server' && 'replicas' in config && config.replicas === 1) {
      issues.push({
        id: `spof_${node.id}`,
        type: 'spof',
        severity: 'warning',
        nodeId: node.id,
        nodeName: config.name,
        title: 'Single Point of Failure (No Replicas)',
        description: `App Server '${config.name}' is running with only 1 replica. If this server fails, incoming traffic cannot be served.`,
        suggestedFix: 'Increase replicas to 2 or more behind a Load Balancer to ensure high availability.',
      });
    }

    if (config.type === 'sql_db' && 'readReplicasCount' in config && config.readReplicasCount === 0) {
      const nodeMetric = metrics?.componentMetrics?.[node.id];
      const isHighLoad = Boolean(nodeMetric && nodeMetric.qps > 2000);
      issues.push({
        id: `spof_db_${node.id}`,
        type: 'spof',
        severity: isHighLoad ? 'critical' : 'warning',
        nodeId: node.id,
        nodeName: config.name,
        title: isHighLoad ? 'Critical Database Contention SPOF' : 'Database Single Point of Failure',
        description: isHighLoad
          ? `Database '${config.name}' is handling ${nodeMetric?.qps} QPS on a single primary instance without read replicas.`
          : `Database '${config.name}' has no read replicas configured. All read and write operations hit the primary instance.`,
        suggestedFix: isHighLoad
          ? 'Add 2+ read replicas to offload read traffic and enable read/write query splitting.'
          : 'Add at least 1 or 2 read replicas to distribute query traffic and provide failover capability.',
        metricValue: nodeMetric ? `${nodeMetric.qps} QPS` : undefined,
      });
    }
  });

  // 2. Missing Cache Layer Detection
  // Databases receiving direct connections from App Server without any Cache in path
  const dbNodes = nodes.filter((n) => n.data.config.type === 'sql_db' || n.data.config.type === 'nosql_db');
  const cacheNodes = nodes.filter(
    (n) =>
      n.data.config.type === 'redis_cache' ||
      n.data.config.type === 'local_cache' ||
      n.data.config.type === 'cdn_cache' ||
      n.data.config.type === 'browser_cache'
  );

  if (dbNodes.length > 0 && cacheNodes.length === 0) {
    const primaryDb = dbNodes[0];
    issues.push({
      id: `missing_cache_${primaryDb.id}`,
      type: 'missing_cache',
      severity: 'warning',
      nodeId: primaryDb.id,
      nodeName: primaryDb.data.config.name,
      title: 'Missing Cache Layer',
      description: `Database '${primaryDb.data.config.name}' is handling all queries directly without an in-memory cache layer.`,
      suggestedFix: 'Add a Redis or Memcached cache before the database to serve hot reads with sub-millisecond latencies.',
    });
  }

  // 3. Synchronous Bottleneck Chain Detection
  // Paths with 4+ synchronous hops in series without async queues
  const queueNodes = nodes.filter(
    (n) =>
      n.data.config.type === 'message_queue' ||
      n.data.config.type === 'task_queue' ||
      n.data.config.type === 'pubsub' ||
      n.data.config.type === 'event_bus'
  );
  if (nodes.length >= 5 && queueNodes.length === 0 && edges.length >= 4) {
    const firstServer = nodes.find((n) => n.data.config.type === 'app_server');
    if (firstServer) {
      issues.push({
        id: `sync_chain_${firstServer.id}`,
        type: 'synchronous_chain',
        severity: 'warning',
        nodeId: firstServer.id,
        nodeName: firstServer.data.config.name,
        title: 'Long Synchronous Request Chain',
        description: 'Requests traverse multiple synchronous hops sequentially, compounding end-to-end latency.',
        suggestedFix: 'Introduce an asynchronous message queue (e.g. Kafka or RabbitMQ) for non-critical write paths.',
      });
    }
  }

  // 4. Capacity & Error Telemetry Overload Detection
  if (metrics && metrics.componentMetrics) {
    Object.values(metrics.componentMetrics).forEach((compMetric) => {
      const targetNode = nodes.find((n) => n.id === compMetric.nodeId);
      if (!targetNode) return;

      const maxCap = effectiveCapacityQps(targetNode.data.config);
      if (compMetric.qps > maxCap * 0.9) {
        issues.push({
          id: `overload_${compMetric.nodeId}`,
          type: 'capacity_overload',
          severity: 'critical',
          nodeId: compMetric.nodeId,
          nodeName: compMetric.nodeName,
          title: 'Component Near Max Capacity',
          description: `'${compMetric.nodeName}' is processing ${compMetric.qps} QPS, approaching its rated limit of ${maxCap} QPS.`,
          suggestedFix: 'Scale out by adding more instances or increasing concurrency pool size.',
          metricValue: `${compMetric.qps} / ${maxCap} QPS`,
        });
      }

      if (compMetric.errorRatePercent >= 20) {
        issues.push({
          id: `high_error_${compMetric.nodeId}`,
          type: 'capacity_overload',
          severity: 'critical',
          nodeId: compMetric.nodeId,
          nodeName: compMetric.nodeName,
          title: 'High Error Rate Detected',
          description: `'${compMetric.nodeName}' has an error rate of ${compMetric.errorRatePercent}%.`,
          suggestedFix: 'Check downstream dependencies, restore healthy state, or increase resource thresholds.',
          metricValue: `${compMetric.errorRatePercent}% errors`,
        });
      }
    });
  }

  return issues;
}
