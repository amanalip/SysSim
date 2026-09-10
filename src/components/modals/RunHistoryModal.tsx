import { useRef, useState } from 'react';
import { useRunHistory, comparisonWarnings } from '../../store/run-history';
import { useStore } from '../../store/use-store';
import { applyImportedArchitecture } from '../../utils/sharing';
import { confirmCanvasReplacement } from '../../utils/destructive-actions';
import { useModalAccessibility } from './useModalAccessibility';
import { ModalPortal } from './ModalPortal';
import styles from './RunHistoryModal.module.css';

export function RunHistoryModal({ onClose }: { onClose: () => void }) {
  const { runs, baselineId, pinBaseline, clear, isFinishing } = useRunHistory();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = runs.find((run) => run.id === selectedId) ?? runs[0];
  const baseline = runs.find((run) => run.id === baselineId);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAccessibility(true, onClose, dialogRef);
  const warnings = baseline && selected ? comparisonWarnings(baseline, selected) : [];
  const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <ModalPortal>
      <div className={styles.overlay}>
        <div
          ref={dialogRef}
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="run-history-title"
          tabIndex={-1}
        >
          <div className={styles.heading}>
            <h2 id="run-history-title">Run history & comparison</h2>
            <button onClick={onClose} aria-label="Close run history">
              Close
            </button>
          </div>
          <p>
            Last 10 stopped runs in this tab, including your pinned baseline. Results remain
            available after resetting the simulation; reloading clears them.
          </p>
          {isFinishing && <p role="status">Waiting for final simulation results…</p>}
          {!selected ? (
            <p>Run the simulation, then press Stop to save a summary here.</p>
          ) : (
            <>
              <div className={styles.actions}>
                <label>
                  Result{' '}
                  <select
                    value={selected.id}
                    onChange={(event) => setSelectedId(Number(event.target.value))}
                  >
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        Run {run.id} · {format(run.elapsedMs / 1000)}s
                        {run.id === baselineId ? ' · baseline' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => pinBaseline(selected.id)}>
                  Use Run {selected.id} as baseline
                </button>
                <button
                  onClick={() => {
                    const state = useStore.getState();
                    if (
                      !confirmCanvasReplacement(
                        { nodes: state.nodes.length, edges: state.edges.length },
                        'Restore the starting setup for this run',
                      )
                    )
                      return;
                    applyImportedArchitecture(structuredClone(selected.architecture));
                    state.setChaosMode(false);
                    state.addToast(
                      'Restored run setup. Chaos is off; start a new experiment when ready.',
                      'success',
                    );
                    onClose();
                  }}
                >
                  Restore starting setup
                </button>
              </div>
              <p>
                Run {selected.id}: {selected.traffic.baseQps.toLocaleString()} offered QPS ·{' '}
                {selected.traffic.pattern} · seed {selected.traffic.seed ?? 1} · engine{' '}
                {selected.engineVersion}
              </p>
              <div className={styles.tableScroll}>
                <table>
                  <caption>
                    Illustrative simulation results. Δ = selected run minus baseline.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Run {selected.id}</th>
                      {baseline && (
                        <>
                          <th scope="col">Baseline {baseline.id}</th>
                          <th scope="col">Δ</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        [
                          'Modeled seconds',
                          selected.elapsedMs / 1000,
                          baseline ? baseline.elapsedMs / 1000 : undefined,
                        ],
                        ['Completed requests', selected.completed, baseline?.completed],
                        ['Completed QPS', selected.throughput, baseline?.throughput],
                        ['Dropped requests', selected.dropped, baseline?.dropped],
                        [
                          'Successful p95 (ms)',
                          selected.succeeded ? selected.p95Ms : undefined,
                          baseline?.succeeded ? baseline.p95Ms : undefined,
                        ],
                      ] as const
                    ).map(([label, value, reference]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>{value === undefined ? 'No samples' : format(value)}</td>
                        {baseline && (
                          <>
                            <td>{reference === undefined ? 'No samples' : format(reference)}</td>
                            <td>
                              {value === undefined || reference === undefined
                                ? '—'
                                : format(value - reference)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {baseline ? (
                warnings.length ? (
                  <div role="status">
                    <p>Comparison caveats:</p>
                    <ul>
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>
                    Workload, seed, engine, and duration match. Architecture changes can explain
                    differences; results are illustrative.
                  </p>
                )
              ) : (
                <p>Pin a baseline, change one setting, then run and stop again to compare.</p>
              )}
              {selected.changedDuringRun && (
                <p>
                  This run includes changes during execution; restoring its starting setup does not
                  replay those changes.
                </p>
              )}
              <button onClick={clear}>Clear run history</button>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
