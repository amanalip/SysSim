import React, { useMemo } from 'react';
import { ShieldCheck, Zap, Activity, DollarSign, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { ModelNotice } from '../ui/ModelNotice';
import styles from './HealthRadarPanel.module.css';

interface PillarScore {
  name: string;
  score: number;
  grade: string;
  color: string;
  icon: React.ReactNode;
  summary: string;
  suggestions: string[];
}

export const HealthRadarPanel: React.FC = () => {
  const { nodes, edges, metrics, bottlenecks, trafficConfig, simState } = useStore();

  const pillarScores = useMemo<PillarScore[]>(() => {
    if (nodes.length === 0) {
      return [
        {
          name: 'Availability',
          score: 0,
          grade: 'N/A',
          color: 'var(--text-muted)',
          icon: <ShieldCheck size={16} />,
          summary: 'Add components to measure system availability.',
          suggestions: ['Add clients and application tiers.'],
        },
        {
          name: 'Scalability',
          score: 0,
          grade: 'N/A',
          color: 'var(--text-muted)',
          icon: <Zap size={16} />,
          summary: 'Canvas is empty.',
          suggestions: ['Add load balancers and horizontal replicas.'],
        },
        {
          name: 'Latency SLA',
          score: 0,
          grade: 'N/A',
          color: 'var(--text-muted)',
          icon: <Activity size={16} />,
          summary: 'No active request telemetry.',
          suggestions: ['Run simulation to record latency.'],
        },
        {
          name: 'Cost Efficiency',
          score: 0,
          grade: 'N/A',
          color: 'var(--text-muted)',
          icon: <DollarSign size={16} />,
          summary: 'No provisioned resources.',
          suggestions: ['Optimize replica sizes against traffic.'],
        },
        {
          name: 'Resilience',
          score: 0,
          grade: 'N/A',
          color: 'var(--text-muted)',
          icon: <RefreshCw size={16} />,
          summary: 'No redundancy detected.',
          suggestions: ['Add redundant paths and retry caches.'],
        },
      ];
    }

    // 1. Availability Score
    let availScore = 100;
    const errorRate = metrics.overallErrorRatePercent || 0;
    availScore -= Math.min(60, errorRate * 2);
    if (bottlenecks.some((b) => b.severity === 'critical')) availScore -= 20;
    availScore = Math.max(10, Math.min(100, Math.round(availScore)));

    // 2. Scalability Score
    let scaleScore = 70;
    const hasLB = nodes.some((n) => n.data.config.type === 'load_balancer');
    const hasCache = nodes.some((n) =>
      ['redis_cache', 'local_cache', 'cdn_cache'].includes(n.data.config.type)
    );
    const hasQueue = nodes.some((n) =>
      ['message_queue', 'pubsub', 'event_bus', 'task_queue'].includes(n.data.config.type)
    );
    if (hasLB) scaleScore += 10;
    if (hasCache) scaleScore += 10;
    if (hasQueue) scaleScore += 10;
    if (bottlenecks.some((b) => b.type === 'capacity_overload')) scaleScore -= 25;
    scaleScore = Math.max(10, Math.min(100, Math.round(scaleScore)));

    // 3. Latency SLA Score
    let latScore = 100;
    const p95 = metrics.p95LatencyMs || 10;
    if (p95 > 500) latScore = 20;
    else if (p95 > 200) latScore = 50;
    else if (p95 > 100) latScore = 75;
    else if (p95 > 50) latScore = 90;
    latScore = Math.max(10, Math.min(100, Math.round(latScore)));

    // 4. Cost Efficiency Score
    let costScore = 80;
    const totalReplicas = nodes.reduce((sum, n) => {
      const c = n.data.config as any;
      return sum + (c.replicas || 1);
    }, 0);
    const effectiveQps = simState === 'running' ? metrics.currentQps : (trafficConfig?.baseQps || 0);
    if (totalReplicas > 12 && effectiveQps < 500) costScore -= 30; // Over-provisioned
    costScore = Math.max(10, Math.min(100, Math.round(costScore)));

    // 5. Resilience Score
    let resScore = 60;
    const totalAppReplicas = nodes
      .filter((n) => n.data.config.type === 'app_server')
      .reduce((sum, n) => sum + ((n.data.config as any).replicas || 1), 0);
    const hasMultipleServers = totalAppReplicas > 1;
    const hasMultipleDbs = nodes.some(
      (n) =>
        n.data.config.type === 'sql_db' &&
        (nodes.filter((x) => x.data.config.type === 'sql_db').length > 1 ||
          Boolean((n.data.config as any).readReplicasCount && (n.data.config as any).readReplicasCount > 0))
    );
    if (hasMultipleServers) resScore += 20;
    if (hasMultipleDbs) resScore += 20;
    if (bottlenecks.some((b) => b.type === 'spof')) resScore -= 25;
    resScore = Math.max(10, Math.min(100, Math.round(resScore)));

    const getGrade = (s: number) => {
      if (s >= 90) return 'A+';
      if (s >= 80) return 'A';
      if (s >= 70) return 'B';
      if (s >= 55) return 'C';
      return 'D';
    };

    const getColor = (s: number) => {
      if (s >= 85) return 'var(--success)';
      if (s >= 65) return 'var(--warning)';
      return 'var(--error)';
    };

    return [
      {
        name: 'Availability',
        score: availScore,
        grade: getGrade(availScore),
        color: getColor(availScore),
        icon: <ShieldCheck size={16} />,
        summary: `${(100 - errorRate).toFixed(1)}% request success rate under load.`,
        suggestions:
          availScore < 80
            ? ['Mitigate single point of failure bottlenecks.', 'Add health check fallbacks.']
            : ['High availability SLA satisfied.'],
      },
      {
        name: 'Scalability',
        score: scaleScore,
        grade: getGrade(scaleScore),
        color: getColor(scaleScore),
        icon: <Zap size={16} />,
        summary: `Architecture supports horizontal load distribution.`,
        suggestions: !hasCache
          ? ['Add Redis or CDN cache layer to offload databases.']
          : ['Load balancer and caches effectively absorb traffic spikes.'],
      },
      {
        name: 'Latency SLA',
        score: latScore,
        grade: getGrade(latScore),
        color: getColor(latScore),
        icon: <Activity size={16} />,
        summary: `p95 Latency: ${metrics.p95LatencyMs.toFixed(1)}ms.`,
        suggestions:
          latScore < 80
            ? ['Introduce caching in front of heavy database queries.', 'Use gRPC for internal service links.']
            : ['Latency is optimal for interactive web experiences.'],
      },
      {
        name: 'Cost Efficiency',
        score: costScore,
        grade: getGrade(costScore),
        color: getColor(costScore),
        icon: <DollarSign size={16} />,
        summary: `${nodes.length} components provisioned.`,
        suggestions:
          costScore < 80
            ? ['Downscale idle replicas during steady periods.']
            : ['Resource allocation closely matches active workload.'],
      },
      {
        name: 'Resilience',
        score: resScore,
        grade: getGrade(resScore),
        color: getColor(resScore),
        icon: <RefreshCw size={16} />,
        summary: `Redundancy & failover capabilities.`,
        suggestions: !hasMultipleDbs
          ? ['Add Read Replicas for primary database redundancy.']
          : ['Redundant instances prevent total service outages.'],
      },
    ];
  }, [nodes, edges, metrics, bottlenecks]);

  const overallAverage = useMemo(() => {
    if (nodes.length === 0) return 0;
    const sum = pillarScores.reduce((acc, p) => acc + p.score, 0);
    return Math.round(sum / pillarScores.length);
  }, [nodes.length, pillarScores]);

  return (
    <div className={styles.container}>
      <ModelNotice
        kind="heuristic"
        detail="Scores summarize simplified rules and simulated telemetry; they are not an architecture certification."
      />
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>5-Pillar Architecture Health Radar</span>
          <span className={styles.subtitle}>
            Continuous well-architected framework evaluation
          </span>
        </div>
        <div className={styles.overallBadge}>
          <span className={styles.scoreNumber}>{overallAverage}</span>
          <span className={styles.scoreLabel}>/ 100 Heuristic</span>
        </div>
      </div>

      <div className={styles.pillarsGrid}>
        {pillarScores.map((pillar) => (
          <div key={pillar.name} className={styles.pillarCard}>
            <div className={styles.cardHeader}>
              <div className={styles.pillarIcon} style={{ color: pillar.color }}>
                {pillar.icon}
              </div>
              <span className={styles.pillarName}>{pillar.name}</span>
              <span
                className={styles.gradeBadge}
                style={{ backgroundColor: `${pillar.color}20`, color: pillar.color }}
              >
                {pillar.grade} ({pillar.score})
              </span>
            </div>

            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{ width: `${pillar.score}%`, backgroundColor: pillar.color }}
              />
            </div>

            <p className={styles.summaryText}>{pillar.summary}</p>

            <div className={styles.suggestionsList}>
              {pillar.suggestions.map((s, idx) => (
                <div key={idx} className={styles.suggestionItem}>
                  {pillar.score >= 80 ? (
                    <CheckCircle size={11} color="var(--success)" />
                  ) : (
                    <AlertTriangle size={11} color="var(--warning)" />
                  )}
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
