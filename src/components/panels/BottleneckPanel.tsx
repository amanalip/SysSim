import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { detectBottlenecks } from '../../engine/metrics/bottleneck-detector';
import styles from './BottleneckPanel.module.css';

export const BottleneckPanel: React.FC = () => {
  const { nodes, edges, metrics, selectNode } = useStore();

  const issues = useMemo(() => {
    return detectBottlenecks(nodes, edges, metrics);
  }, [nodes, edges, metrics]);

  if (issues.length === 0) {
    return (
      <div className={styles.emptyState}>
        <CheckCircle2 size={24} color="var(--success)" />
        <span className={styles.emptyTitle}>No Bottlenecks Detected</span>
        <span style={{ fontSize: 11 }}>
          Your current architecture satisfies baseline redundancy and capacity checks.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.panelContainer}>
      <div className={styles.issueList}>
        {issues.map((issue) => (
          <div
            key={issue.id}
            className={`${styles.issueCard} ${
              issue.severity === 'critical'
                ? styles.issueCardCritical
                : styles.issueCardWarning
            }`}
          >
            <div className={styles.issueHeader}>
              <div className={styles.titleArea}>
                <AlertTriangle
                  size={14}
                  color={
                    issue.severity === 'critical' ? 'var(--error)' : 'var(--warning)'
                  }
                />
                <span>{issue.title}</span>
              </div>
              <span
                className={`${styles.severityBadge} ${
                  issue.severity === 'critical'
                    ? styles.badgeCritical
                    : styles.badgeWarning
                }`}
              >
                {issue.severity}
              </span>
            </div>

            <div className={styles.issueDesc}>{issue.description}</div>

            <div className={styles.fixArea}>
              <span className={styles.fixLabel}>Suggested Remedy</span>
              <span className={styles.fixText}>{issue.suggestedFix}</span>
            </div>

            <button
              className={styles.focusBtn}
              onClick={() => {
                selectNode(issue.nodeId);
                useStore.getState().setIsPropertiesPanelOpen(true);
                useStore.getState().addToast(`Inspecting ${issue.nodeName} in Properties Panel`, 'info');
              }}
            >
              <span>Inspect {issue.nodeName}</span>
              <ArrowRight size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
