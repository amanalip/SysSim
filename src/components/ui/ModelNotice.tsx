import React from 'react';
import { Info } from 'lucide-react';
import styles from './ModelNotice.module.css';

type ModelNoticeKind = 'simulation' | 'heuristic' | 'estimate';

interface ModelNoticeProps {
  kind: ModelNoticeKind;
  detail: string;
}

const LABELS: Record<ModelNoticeKind, string> = {
  simulation: 'Simulated output',
  heuristic: 'Heuristic guidance',
  estimate: 'Planning estimate',
};

export const ModelNotice: React.FC<ModelNoticeProps> = ({ kind, detail }) => {
  const label = LABELS[kind];

  return (
    <aside className={styles.notice} aria-label={`${label}: ${detail}`}>
      <Info className={styles.icon} size={13} aria-hidden="true" />
      <span>
        <span className={styles.label}>{label}.</span>{' '}
        <span className={styles.detail}>{detail}</span>
      </span>
    </aside>
  );
};
