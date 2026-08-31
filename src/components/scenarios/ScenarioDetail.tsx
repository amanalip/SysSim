import React, { useState, useEffect, useMemo } from 'react';
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
import { simulationRuntime as simBridge } from '../../engine/simulation-runtime';
import { ScenarioInterviewStepper } from './ScenarioInterviewStepper';
import styles from './ScenarioDetail.module.css';
import { compareArchitectures } from '../../scenarios/compare';
import { createScenarioProgress } from '../../scenarios/progress';

interface ScenarioDetailProps {
  scenario: Scenario;
  onBack: () => void;
}

export const ScenarioDetail: React.FC<ScenarioDetailProps> = ({ scenario, onBack }) => {
  const {
    loadReferenceDesign,
    showReferenceOverlay,
    setShowReferenceOverlay,
    markScenarioCompleted,
    completedScenarioIds,
    nodes,
    edges,
    sideBySideMode,
    setSideBySideMode,
    scenarioProgress,
    updateScenarioProgress,
    recordScenarioAttempt,
  } = useStore();

  const [openAnswers, setOpenAnswers] = useState<Record<number, boolean>>({});
  const progress = scenarioProgress[scenario.id] || createScenarioProgress(scenario.id);
  const comparison = useMemo(
    () => compareArchitectures({ nodes, edges }, scenario.referenceDesign),
    [nodes, edges, scenario.referenceDesign],
  );

  useEffect(() => {
    setOpenAnswers({});
  }, [scenario.id]);

  const isCompleted = completedScenarioIds.includes(scenario.id);

  const handleUnlockNextHint = () => {
    updateScenarioProgress(scenario.id, {
      revealedHintCount: Math.min(scenario.hints.length, progress.revealedHintCount + 1),
    });
  };

  const toggleAnswer = (idx: number) => {
    setOpenAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleLoadReference = () => {
    if (
      (nodes.length || edges.length) &&
      !window.confirm(
        'Replace the current canvas with this reference architecture? Your saved snapshots are unaffected.',
      )
    )
      return;
    simBridge.reset();
    loadReferenceDesign(scenario.referenceDesign);
    recordScenarioAttempt(scenario.id);
    updateScenarioProgress(scenario.id, { mode: 'reference', completionIntent: 'in-progress' });
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

      <div className={styles.modeSwitcher} role="group" aria-label="Scenario learning mode">
        <button
          className={progress.mode === 'challenge' ? styles.modeActive : ''}
          onClick={() => updateScenarioProgress(scenario.id, { mode: 'challenge' })}
        >
          Challenge mode
        </button>
        <button
          className={progress.mode === 'reference' ? styles.modeActive : ''}
          onClick={() => updateScenarioProgress(scenario.id, { mode: 'reference' })}
        >
          Reference-design mode
        </button>
      </div>
      <div className={styles.modeHelp}>
        {progress.mode === 'challenge'
          ? 'Your current canvas stays intact while you inspect requirements, hints, and experiments.'
          : 'Study one valid reference and compare its responsibilities and behavior with your design.'}
      </div>

      {/* Problem Statement */}
      <div className={styles.problemBox}>{scenario.problemStatement}</div>

      <div className={styles.approximationBox}>
        <strong>Reference, not answer key.</strong>
        {scenario.approximationNotes?.map((note) => (
          <span key={note}>{note}</span>
        ))}
      </div>

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
          <span className={styles.constraintVal}>{scenario.constraints.maxP99LatencyMs} ms</span>
        </div>
        <div className={styles.constraintItem}>
          <span className={styles.constraintLabel}>Availability SLA</span>
          <span className={styles.constraintVal}>
            {scenario.constraints.availabilitySlaPercent}%
          </span>
        </div>
        {scenario.constraints.readWriteRatio && (
          <div className={styles.constraintItem}>
            <span className={styles.constraintLabel}>Read:Write</span>
            <span className={styles.constraintVal}>{scenario.constraints.readWriteRatio}</span>
          </div>
        )}
        {scenario.constraints.retentionTimeline && (
          <div className={styles.constraintItem}>
            <span className={styles.constraintLabel}>Retention</span>
            <span className={styles.constraintVal}>{scenario.constraints.retentionTimeline}</span>
          </div>
        )}
      </div>

      {/* FAANG System Design Interview Workflow */}
      <ScenarioInterviewStepper scenario={scenario} />

      {/* Interactive Actions */}
      <div className={styles.actionsGroup}>
        <button className={styles.primaryBtn} onClick={handleLoadReference}>
          <Layers size={14} />
          <span>Replace Canvas with Reference Architecture</span>
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={() => setShowReferenceOverlay(!showReferenceOverlay)}
        >
          <span>{showReferenceOverlay ? 'Hide Reference Overlay' : 'Show Reference Overlay'}</span>
        </button>

        <button className={styles.secondaryBtn} onClick={() => setSideBySideMode(!sideBySideMode)}>
          <span>
            {sideBySideMode ? 'Hide Behavioral Comparison' : 'Compare User and Reference Designs'}
          </span>
        </button>

        <button
          className={`${styles.secondaryBtn} ${isCompleted ? styles.completedBtn : ''}`}
          onClick={() => {
            markScenarioCompleted(scenario.id);
            useStore
              .getState()
              .addToast(
                isCompleted
                  ? `Scenario #${scenario.id} marked as unsolved`
                  : `Scenario #${scenario.id} marked as solved!`,
                isCompleted ? 'info' : 'success',
              );
          }}
        >
          <CheckCircle2 size={13} />
          <span>
            {isCompleted ? 'Self-assessed Complete (Undo)' : 'Mark Self-assessed Complete'}
          </span>
        </button>
      </div>

      {sideBySideMode && (
        <div className={styles.comparisonBox} aria-label="Behavioral architecture comparison">
          <strong>Neutral comparison</strong>
          <span>
            Your graph: {comparison.userNodeCount} nodes / {comparison.userEdgeCount} edges.
            Reference: {comparison.referenceNodeCount} nodes / {comparison.referenceEdgeCount}{' '}
            edges.
          </span>
          <span>
            Shared responsibilities: {comparison.sharedComponentTypes.join(', ') || 'none yet'}.
          </span>
          <span>Only in your graph: {comparison.userOnlyComponentTypes.join(', ') || 'none'}.</span>
          <span>
            Only in the reference: {comparison.referenceOnlyComponentTypes.join(', ') || 'none'}.
          </span>
          <span>{comparison.guidance}</span>
        </div>
      )}

      {/* Progressive Hints */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          Progressive Hints ({progress.revealedHintCount}/{scenario.hints.length})
        </div>
        {scenario.hints.slice(0, progress.revealedHintCount).map((h) => (
          <div key={h.step} className={styles.hintCard}>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', marginRight: 6 }}>
              Hint {h.step}:
            </span>
            {h.hint}
          </div>
        ))}
        {progress.revealedHintCount < scenario.hints.length && (
          <button
            className={styles.secondaryBtn}
            onClick={handleUnlockNextHint}
            style={{ fontSize: 11, padding: '6px 10px' }}
          >
            <HelpCircle size={12} />
            <span>
              Unlock Next Hint ({progress.revealedHintCount + 1}/{scenario.hints.length})
            </span>
          </button>
        )}
      </div>

      <div className={styles.section}>
        <label className={styles.sectionTitle} htmlFor={`scenario-notes-${scenario.id}`}>
          Private learning notes
        </label>
        <textarea
          id={`scenario-notes-${scenario.id}`}
          className={styles.notesInput}
          value={progress.notes}
          maxLength={10_000}
          placeholder="Record assumptions, experiment results, and follow-up questions…"
          onChange={(event) =>
            updateScenarioProgress(scenario.id, {
              notes: event.target.value,
              completionIntent: 'in-progress',
            })
          }
        />
        <span className={styles.progressMeta}>
          Attempts: {progress.attempts} · Status: {progress.completionIntent.replace('-', ' ')} ·
          Saved locally
        </span>
      </div>

      {/* Interview Discussion Points */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Interview Discussion Points</div>
        {scenario.discussionPoints.map((dp, idx) => (
          <div key={idx} className={styles.discussionItem}>
            <div className={styles.question}>{dp.question}</div>
            {openAnswers[idx] && <div className={styles.answer}>{dp.answer}</div>}
            <button className={styles.toggleAnswerBtn} onClick={() => toggleAnswer(idx)}>
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
          <div className={styles.sourceItem} key={`${src.title}-${idx}`}>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
              aria-label={`${src.title} — ${src.authorOrOrg}`}
            >
              <span>
                {src.title} ({src.authorOrOrg})
              </span>
              <ExternalLink size={10} />
            </a>
            <span>
              {src.sourceType} · verified {src.lastVerifiedOn}
            </span>
            <span>{src.supports}</span>
          </div>
        ))}
        <span className={styles.progressMeta}>
          Review owner: {scenario.reviewOwner} · Content reviewed {scenario.contentReviewedOn}
        </span>
      </div>
    </div>
  );
};
