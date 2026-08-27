import React from 'react';
import { Info } from 'lucide-react';
import styles from './ModelNotice.module.css';

type ModelNoticeKind = 'simulation' | 'heuristic' | 'estimate';

interface ModelNoticeProps {
  kind: ModelNoticeKind;
  detail: string;
  assumptionLabel: string;
  assumptionSection: string;
}

const LABELS: Record<ModelNoticeKind, string> = {
  simulation: 'Simulated output',
  heuristic: 'Heuristic guidance',
  estimate: 'Planning estimate',
};

const PRODUCT_CONTRACT_URL =
  'https://github.com/amanalip/SysSim/blob/main/docs/product-contract.md';

export const ModelNotice: React.FC<ModelNoticeProps> = ({
  kind,
  detail,
  assumptionLabel,
  assumptionSection,
}) => {
  const label = LABELS[kind];

  return (
    <aside className={styles.notice} aria-label={`${label}: ${detail}`}>
      <Info className={styles.icon} size={13} aria-hidden="true" />
      <span className={styles.content}>
        <span className={styles.label}>{label}.</span>{' '}
        <span className={styles.detail}>{detail}</span>
        <a
          className={styles.assumptionsLink}
          href={`${PRODUCT_CONTRACT_URL}#${assumptionSection}`}
          target="_blank"
          rel="noreferrer"
        >
          Assumptions: {assumptionLabel}
        </a>
      </span>
    </aside>
  );
};
