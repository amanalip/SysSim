import React, { useMemo } from 'react';
import { ShieldCheck, Zap, Activity, DollarSign, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { averageHealthScore, HealthPillarScore, scoreArchitectureHealth } from '../../analysis/health-scoring';
import { useStore } from '../../store/use-store';
import { ModelNotice } from '../ui/ModelNotice';
import styles from './HealthRadarPanel.module.css';

const icons: Record<HealthPillarScore['name'], React.ReactNode> = {
  Availability: <ShieldCheck size={16} />, Scalability: <Zap size={16} />,
  'Modeled Latency': <Activity size={16} />, 'Cost Efficiency': <DollarSign size={16} />, Resilience: <RefreshCw size={16} />,
};
const grade = (score: number | null): string => score === null ? 'N/A' : score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
const color = (score: number | null): string => score === null ? 'var(--text-muted)' : score >= 85 ? 'var(--success)' : score >= 65 ? 'var(--warning)' : 'var(--error)';

export const HealthRadarPanel: React.FC = () => {
  const { nodes, edges, metrics, bottlenecks, trafficConfig } = useStore();
  const pillars = useMemo(() => scoreArchitectureHealth({ nodes, edges, metrics, bottlenecks, trafficConfig }), [nodes, edges, metrics, bottlenecks, trafficConfig]);
  const overallAverage = useMemo(() => averageHealthScore(pillars), [pillars]);

  return (
    <div className={styles.container}>
      <ModelNotice kind="heuristic"
        detail="Design-time rules and runtime telemetry are scored separately. The radar is a discussion aid and has not been externally validated."
        assumptionLabel="documented health-score formulas" assumptionSection="health-scoring-formulas" />
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>5-Pillar Heuristic Architecture Health Radar</span>
          <span className={styles.subtitle}>Evidence-aware design prompts; not an architecture certification</span>
        </div>
        <div className={styles.overallBadge}>
          <span className={styles.scoreNumber}>{overallAverage ?? 'N/A'}</span>
          <span className={styles.scoreLabel}>{overallAverage === null ? 'Awaiting evidence' : '/ 100 scored pillars'}</span>
        </div>
      </div>

      <div className={styles.pillarsGrid}>
        {pillars.map((pillar) => {
          const pillarColor = color(pillar.score);
          return (
            <div key={pillar.name} className={styles.pillarCard}>
              <div className={styles.cardHeader}>
                <div className={styles.pillarIcon} style={{ color: pillarColor }}>{icons[pillar.name]}</div>
                <span className={styles.pillarName}>{pillar.name}</span>
                <span className={styles.gradeBadge} style={{ backgroundColor: `${pillarColor}20`, color: pillarColor }}>
                  {grade(pillar.score)} ({pillar.score ?? 'N/A'})
                </span>
              </div>
              <div className={styles.evidenceRow}>
                <span>{pillar.evidenceKind}</span><span>Confidence: {pillar.confidence}</span>
                {pillar.sampleSize > 0 ? <span>n={pillar.sampleSize.toLocaleString()}</span> : null}
              </div>
              <div className={styles.progressTrack} aria-label={`${pillar.name} score ${pillar.score ?? 'not available'}`}>
                <div className={styles.progressBar} style={{ width: `${pillar.score ?? 0}%`, backgroundColor: pillarColor }} />
              </div>
              <p className={styles.summaryText}>{pillar.summary}</p>
              <div className={styles.suggestionsList}>
                {pillar.suggestions.map((suggestion) => (
                  <div key={suggestion} className={styles.suggestionItem}>
                    {(pillar.score ?? 0) >= 80 ? <CheckCircle size={11} color="var(--success)" /> : <AlertTriangle size={11} color="var(--warning)" />}
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
