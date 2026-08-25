import React, { useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Scenario } from '../../model/types';
import { useStore } from '../../store/use-store';
import { simBridge } from '../../engine/sim-bridge';
import styles from './ScenarioDetail.module.css';

interface ScenarioDetailProps {
  scenario: Scenario;
  onBack: () => void;
}

export const ScenarioDetail: React.FC<ScenarioDetailProps> = ({
  scenario,
  onBack,
}) => {
  const {
    loadReferenceDesign,
    showReferenceOverlay,
    setShowReferenceOverlay,
    markScenarioCompleted,
    completedScenarioIds,
  } = useStore();

  const [unlockedHintCount, setUnlockedHintCount] = useState(1);
  const [openAnswers, setOpenAnswers] = useState<Record<number, boolean>>({});

  const isCompleted = completedScenarioIds.includes(scenario.id);

  const handleUnlockNextHint = () => {
    setUnlockedHintCount((prev) => Math.min(scenario.hints.length, prev + 1));
  };

  const toggleAnswer = (idx: number) => {
    setOpenAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleLoadReference = () => {
    simBridge.reset();
    loadReferenceDesign(scenario.referenceDesign);
    simBridge.syncGraph();
    useStore.getState().addToast(`Loaded Reference Architecture for ${scenario.title}`, 'info');
  };

  return (
    <div className={styles.detailContainer}>
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={12} />
        <span>Back to Scenarios</span>
      </button>

      <div className={styles.headerSection}>
        <div className={styles.title}>
          #{scenario.id}. {scenario.title}
        </div>
        <div className={styles.metaRow}>
          <span>{scenario.category}</span>
          <span>•</span>
          <span style={{ fontWeight: 700 }}>{scenario.difficulty}</span>
        </div>
      </div>

      {/* Problem Statement */}
      <div className={styles.problemBox}>{scenario.problemStatement}</div>

      {/* Constraints */}
      <div className={styles.constraintsGrid}>
        <div className={styles.constraintItem}>
          <span className={styles.constraintLabel}>Target QPS</span>
          <span className={styles.constraintVal}>
            {scenario.constraints.targetQps.toLocaleString()}
          </span>
        </div>
        <div className={styles.constraintItem}>
          <span className={styles.constraintLabel}>Data Scale</span>
          <span className={styles.constraintVal}>
            {scenario.constraints.dataSizeGb.toLocaleString()} GB
          </span>
        </div>
        <div className={styles.constraintItem}>
          <span className={styles.constraintLabel}>Max p99 Latency</span>
          <span className={styles.constraintVal}>
            {scenario.constraints.maxP99LatencyMs} ms
          </span>
        </div>
        <div className={styles.constraintItem}>
          <span className={styles.constraintLabel}>Availability SLA</span>
          <span className={styles.constraintVal}>
            {scenario.constraints.availabilitySlaPercent}%
          </span>
        </div>
      </div>

      {/* Interactive Actions */}
      <div className={styles.actionsGroup}>
        <button className={styles.primaryBtn} onClick={handleLoadReference}>
          <Layers size={14} />
          <span>Load Reference Architecture to Canvas</span>
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={() => setShowReferenceOverlay(!showReferenceOverlay)}
        >
          <span>
            {showReferenceOverlay ? 'Hide Reference Overlay' : 'Show Reference Overlay'}
          </span>
        </button>

        <button
          className={`${styles.secondaryBtn} ${isCompleted ? styles.completedBtn : ''}`}
          onClick={() => {
            markScenarioCompleted(scenario.id);
            useStore.getState().addToast(
              isCompleted
                ? `Scenario #${scenario.id} marked as unsolved`
                : `Scenario #${scenario.id} marked as solved!`,
              isCompleted ? 'info' : 'success'
            );
          }}
        >
          <CheckCircle2 size={13} />
          <span>{isCompleted ? 'Solved (Click to Undo)' : 'Mark as Solved'}</span>
        </button>
      </div>

      {/* Progressive Hints */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          Progressive Hints ({unlockedHintCount}/{scenario.hints.length})
        </div>
        {scenario.hints.slice(0, unlockedHintCount).map((h) => (
          <div key={h.step} className={styles.hintCard}>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', marginRight: 6 }}>
              Hint {h.step}:
            </span>
            {h.hint}
          </div>
        ))}
        {unlockedHintCount < scenario.hints.length && (
          <button
            className={styles.secondaryBtn}
            onClick={handleUnlockNextHint}
            style={{ fontSize: 11, padding: '6px 10px' }}
          >
            <HelpCircle size={12} />
            <span>Unlock Next Hint ({unlockedHintCount + 1}/{scenario.hints.length})</span>
          </button>
        )}
      </div>

      {/* Interview Discussion Points */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Interview Discussion Points</div>
        {scenario.discussionPoints.map((dp, idx) => (
          <div key={idx} className={styles.discussionItem}>
            <div className={styles.question}>{dp.question}</div>
            {openAnswers[idx] && <div className={styles.answer}>{dp.answer}</div>}
            <button
              className={styles.toggleAnswerBtn}
              onClick={() => toggleAnswer(idx)}
            >
              {openAnswers[idx] ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  Hide Answer <ChevronUp size={10} />
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  Show Answer <ChevronDown size={10} />
                </span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Verified Source Citations */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Verified Citations & References</div>
        {scenario.sources.map((src, idx) => (
          <a
            key={idx}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            <span>
              {src.title} ({src.authorOrOrg})
            </span>
            <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
};
