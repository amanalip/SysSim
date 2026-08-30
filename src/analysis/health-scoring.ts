import { estimateArchitectureCost } from './cost-estimator';
import { AnyComponentConfig, BottleneckIssue, OverallMetrics, ProtocolEdgeData, TrafficConfig } from '../model/types';

export type HealthEvidenceKind = 'design heuristic' | 'runtime telemetry';
export type HealthConfidence = 'no evidence' | 'low' | 'medium' | 'high' | 'design-only';

export interface HealthPillarScore {
  name: 'Availability' | 'Scalability' | 'Modeled Latency' | 'Cost Efficiency' | 'Resilience';
  score: number | null;
  evidenceKind: HealthEvidenceKind;
  confidence: HealthConfidence;
  sampleSize: number;
  summary: string;
  suggestions: string[];
}

interface HealthGraphNode { id: string; data: { config: AnyComponentConfig } }
interface HealthGraphEdge { source: string; target: string; data: ProtocolEdgeData }

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const confidence = (samples: number): HealthConfidence => samples === 0 ? 'no evidence' : samples >= 1_000 ? 'high' : samples >= 100 ? 'medium' : 'low';

function graphEvidence(nodes: HealthGraphNode[], edges: HealthGraphEdge[]) {
  const active = edges.filter((edge) => !edge.data.isCut && !['replication', 'observability'].includes(edge.data.purpose || 'request'));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  active.forEach((edge) => { outgoing.get(edge.source)?.push(edge.target); incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1); });
  const sources = nodes.filter((node) => node.data.config.type === 'client');
  const roots = sources.length ? sources : nodes.filter((node) => (incoming.get(node.id) || 0) === 0);
  const reachable = new Set(roots.map((node) => node.id));
  const pending = [...reachable];
  while (pending.length) {
    const current = pending.shift()!;
    for (const next of outgoing.get(current) || []) if (!reachable.has(next)) { reachable.add(next); pending.push(next); }
  }
  const pathCount = (start: string, target: string, seen = new Set<string>()): number => {
    if (start === target) return 1;
    if (seen.has(start)) return 0;
    const nextSeen = new Set(seen).add(start);
    let count = 0;
    for (const next of outgoing.get(start) || []) {
      count += pathCount(next, target, nextSeen);
      if (count >= 2) return 2;
    }
    return count;
  };
  const terminals = nodes.filter((node) => reachable.has(node.id) && (outgoing.get(node.id) || []).length === 0 && !roots.some((root) => root.id === node.id));
  const hasRedundantPath = terminals.some((terminal) => roots.some((root) => pathCount(root.id, terminal.id) >= 2));
  const reachableTypes = new Set(nodes.filter((node) => reachable.has(node.id)).map((node) => node.data.config.type));
  return { reachable, reachableTypes, hasRedundantPath };
}

export function scoreArchitectureHealth(input: {
  nodes: HealthGraphNode[];
  edges: HealthGraphEdge[];
  metrics: OverallMetrics;
  bottlenecks: BottleneckIssue[];
  trafficConfig: TrafficConfig;
}): HealthPillarScore[] {
  const { nodes, edges, metrics, bottlenecks, trafficConfig } = input;
  if (!nodes.length) return ['Availability', 'Scalability', 'Modeled Latency', 'Cost Efficiency', 'Resilience'].map((name) => ({
    name: name as HealthPillarScore['name'], score: null,
    evidenceKind: name === 'Availability' || name === 'Modeled Latency' ? 'runtime telemetry' : 'design heuristic',
    confidence: 'no evidence', sampleSize: 0, summary: 'Add an architecture and run the simulation to produce evidence.', suggestions: ['Add a traffic source and connected service path.'],
  }));
  const samples = metrics.totalRequestsCompleted ?? (metrics.totalRequestsSuccess + metrics.totalRequestsFailed);
  const runtimeConfidence = confidence(samples);
  const graph = graphEvidence(nodes, edges);

  const availability: HealthPillarScore = samples === 0 ? {
    name: 'Availability', score: null, evidenceKind: 'runtime telemetry', confidence: 'no evidence', sampleSize: 0,
    summary: 'No completed requests; availability is not scored yet.', suggestions: ['Run the simulation long enough to complete representative requests.'],
  } : {
    name: 'Availability', score: clamp(100 - metrics.overallErrorRatePercent * 2), evidenceKind: 'runtime telemetry', confidence: runtimeConfidence, sampleSize: samples,
    summary: `${(100 - metrics.overallErrorRatePercent).toFixed(1)}% modeled request success across ${samples.toLocaleString()} completed requests.`,
    suggestions: metrics.overallErrorRatePercent > 1 ? ['Inspect failed traces and reachable unhealthy dependencies.'] : ['Exercise failure and recovery paths before treating this result as resilient.'],
  };

  let scalabilityScore = 40;
  const hasLB = graph.reachableTypes.has('load_balancer');
  const hasCache = [...graph.reachableTypes].some((type) => ['redis_cache', 'local_cache', 'cdn_cache', 'cdn'].includes(type));
  const hasQueue = [...graph.reachableTypes].some((type) => ['message_queue', 'task_queue', 'pubsub', 'event_bus'].includes(type));
  const replicatedService = nodes.some((node) => graph.reachable.has(node.id) && 'replicas' in node.data.config && Number(node.data.config.replicas) > 1);
  if (hasLB) scalabilityScore += 15;
  if (hasCache) scalabilityScore += 10;
  if (hasQueue) scalabilityScore += 10;
  if (replicatedService) scalabilityScore += 15;
  if (bottlenecks.some((issue) => issue.type === 'capacity_overload')) scalabilityScore -= 25;
  const scalability: HealthPillarScore = {
    name: 'Scalability', score: clamp(scalabilityScore), evidenceKind: 'design heuristic', confidence: 'design-only', sampleSize: 0,
    summary: `Reachable-path signals: load balancer ${hasLB ? 'yes' : 'no'}, cache ${hasCache ? 'yes' : 'no'}, async boundary ${hasQueue ? 'yes' : 'no'}, replicated service ${replicatedService ? 'yes' : 'no'}.`,
    suggestions: [!hasLB ? 'Add load distribution only where multiple reachable targets exist.' : !replicatedService ? 'Route to more than one service instance.' : 'Load-test the reachable path near its expected peak.'],
  };

  const latencyScore = samples === 0 ? null : metrics.p95LatencyMs > 500 ? 20 : metrics.p95LatencyMs > 200 ? 50 : metrics.p95LatencyMs > 100 ? 70 : metrics.p95LatencyMs > 50 ? 85 : 95;
  const latency: HealthPillarScore = {
    name: 'Modeled Latency', score: latencyScore, evidenceKind: 'runtime telemetry', confidence: runtimeConfidence, sampleSize: samples,
    summary: samples === 0 ? 'No successful latency samples; latency is not scored yet.' : `Modeled p95 is ${metrics.p95LatencyMs.toFixed(1)}ms across ${samples.toLocaleString()} completed requests.`,
    suggestions: samples === 0 ? ['Run representative traffic before evaluating latency.'] : latencyScore! < 70 ? ['Inspect the slowest trace path and queue/service-time breakdown.'] : ['Validate the modeled threshold against a real SLO.'],
  };

  const workloadQps = Math.max(0, metrics.completedThroughputQps || trafficConfig.baseQps || 0);
  const monthlyCost = estimateArchitectureCost(nodes, workloadQps, 'aws', false).totalMonthly;
  const monthlyMillions = workloadQps * 86_400 * 30 / 1_000_000;
  const costPerMillion = monthlyCost / Math.max(1, monthlyMillions);
  const costScore = costPerMillion > 100 ? 25 : costPerMillion > 25 ? 50 : costPerMillion > 10 ? 70 : costPerMillion > 5 ? 85 : 95;
  const cost: HealthPillarScore = {
    name: 'Cost Efficiency', score: workloadQps === 0 ? null : costScore, evidenceKind: 'design heuristic', confidence: workloadQps === 0 ? 'no evidence' : 'design-only', sampleSize: 0,
    summary: workloadQps === 0 ? 'No workload assumption; cost efficiency is not scored.' : `$${monthlyCost.toLocaleString()}/month illustrative cost at ${Math.round(workloadQps).toLocaleString()} QPS (${costPerMillion.toFixed(2)} USD per million requests).`,
    suggestions: ['Compare this illustrative profile with dated provider quotes and measured utilization.'],
  };

  const hasSpof = bottlenecks.some((issue) => issue.type === 'spof' && graph.reachable.has(issue.nodeId));
  const failoverConfigured = nodes.some((node) => graph.reachable.has(node.id) && node.data.config.type === 'sql_db' && node.data.config.automaticFailover && node.data.config.readReplicasCount > 0);
  let resilienceScore = 30 + (graph.hasRedundantPath ? 30 : 0) + (failoverConfigured ? 20 : 0) + (!hasSpof ? 20 : 0);
  const resilience: HealthPillarScore = {
    name: 'Resilience', score: clamp(resilienceScore), evidenceKind: 'design heuristic', confidence: 'design-only', sampleSize: 0,
    summary: `Reachable redundant path ${graph.hasRedundantPath ? 'detected' : 'not detected'}; database failover ${failoverConfigured ? 'configured' : 'not configured'}; reachable SPOF ${hasSpof ? 'detected' : 'not detected'}.`,
    suggestions: [hasSpof ? 'Add an independently routed failover path around the reported SPOF.' : !graph.hasRedundantPath ? 'Draw and validate a second reachable route to critical terminal dependencies.' : 'Run a chaos drill to test the configured route and recovery behavior.'],
  };
  return [availability, scalability, latency, cost, resilience];
}

export function averageHealthScore(pillars: HealthPillarScore[]): number | null {
  const scored = pillars.flatMap((pillar) => pillar.score === null ? [] : [pillar.score]);
  return scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : null;
}
