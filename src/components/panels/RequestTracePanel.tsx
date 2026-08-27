import React, { useState } from 'react';
import { Network, AlertTriangle, Eye } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { SimRequest } from '../../model/types';
import { ComponentIcon } from '../icons/ComponentIcon';
import { ModelNotice } from '../ui/ModelNotice';
import styles from './RequestTracePanel.module.css';

export const RequestTracePanel: React.FC = () => {
  const { activeRequests, selectNode, setIsPropertiesPanelOpen } = useStore();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  // Sample the most recent completed or in-flight requests
  const traces = activeRequests.slice(-25).reverse();
  const selectedTrace: SimRequest | undefined = traces.find((t) => t.id === selectedTraceId) || traces[0];

  if (traces.length === 0) {
    return (
      <div className={styles.tracePanel}>
        <ModelNotice
          kind="simulation"
          detail="Traces are synthetic model paths, not telemetry captured from a deployed system."
        />
        <div className={styles.traceContainer}>
          <div className={styles.emptyState}>
            <Network size={28} color="var(--text-muted)" />
            <span className={styles.emptyTitle}>No Request Traces Recorded Yet</span>
            <span className={styles.emptySubtitle}>
              Start the simulation to capture and inspect synthetic hop-by-hop request traces.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Calculate slowest hop in selected trace
  const hops = selectedTrace?.path || [];
  const maxHopLatency = Math.max(1, ...hops.map((h) => h.latencyMs));
  const totalLatency = selectedTrace?.totalLatencyMs || hops.reduce((acc, h) => acc + h.latencyMs, 0);

  return (
    <div className={styles.tracePanel}>
      <ModelNotice
        kind="simulation"
        detail="Traces are synthetic model paths, not telemetry captured from a deployed system."
      />
      <div className={styles.traceContainer}>
        {/* Left List of Traces */}
        <div className={styles.traceList}>
          <div className={styles.listHeader}>
            <span>Recorded Traces ({traces.length})</span>
          </div>
          <div className={styles.listBody}>
            {traces.map((trace) => {
              const isSelected = trace.id === (selectedTrace?.id || traces[0]?.id);
              const isSuccess = trace.status === 'success';
              const isRateLimited = trace.status === 'rate_limited';

              return (
                <div
                  key={trace.id}
                  className={`${styles.traceItem} ${isSelected ? styles.traceItemActive : ''}`}
                  onClick={() => setSelectedTraceId(trace.id)}
                >
                  <div className={styles.traceItemTop}>
                    <span
                      className={styles.statusPill}
                      style={{
                        backgroundColor: isSuccess
                          ? 'rgba(63, 185, 80, 0.15)'
                          : isRateLimited
                          ? 'rgba(210, 153, 34, 0.15)'
                          : 'rgba(248, 81, 73, 0.15)',
                        color: isSuccess
                          ? 'var(--success)'
                          : isRateLimited
                          ? 'var(--warning)'
                          : 'var(--error)',
                      }}
                    >
                      {isSuccess ? '200 OK' : isRateLimited ? '429 Limit' : '500 Error'}
                    </span>
                    <span className={styles.traceLatency}>
                      {trace.totalLatencyMs.toFixed(1)}ms
                    </span>
                  </div>
                  <div className={styles.traceItemBottom}>
                    <span className={styles.traceHopsCount}>{trace.path.length} hops</span>
                    <span className={styles.traceTime}>
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Trace Waterfall Inspector */}
        {selectedTrace && (
          <div className={styles.waterfallView}>
            <div className={styles.waterfallHeader}>
              <div className={styles.traceOverview}>
                <span className={styles.waterfallTitle}>
                  Trace #{selectedTrace.id.slice(0, 12)}
                </span>
                <span className={styles.waterfallMeta}>
                  Total Latency: <b>{totalLatency.toFixed(1)}ms</b> • Hops:{' '}
                  <b>{hops.length}</b> • Status: <b>{selectedTrace.status}</b>
                </span>
              </div>
            </div>

            <div className={styles.hopsList}>
              {hops.map((hop, idx) => {
                const hopPercent = Math.round(
                  (hop.latencyMs / Math.max(1, totalLatency)) * 100,
                );
                const isSlowest = hop.latencyMs === maxHopLatency && hops.length > 1;

                return (
                  <div
                    key={idx}
                    className={`${styles.hopCard} ${
                      isSlowest ? styles.hopCardBottleneck : ''
                    }`}
                  >
                  <div className={styles.hopLeft}>
                    <div className={styles.hopNumber}>{idx + 1}</div>
                    <div className={styles.hopIconBox}>
                      <ComponentIcon type={hop.nodeType} size={15} />
                    </div>
                    <div className={styles.hopInfo}>
                      <div className={styles.hopNameRow}>
                        <span className={styles.hopName}>{hop.nodeName}</span>
                        <span className={styles.hopType}>{hop.nodeType}</span>
                        {isSlowest && (
                          <span className={styles.rootCausePill}>
                            <AlertTriangle size={10} /> Root-Cause Delay ({hopPercent}%)
                          </span>
                        )}
                      </div>
                      {hop.info && <span className={styles.hopDetails}>{hop.info}</span>}
                    </div>
                  </div>

                  <div className={styles.hopRight}>
                    <div className={styles.hopTiming}>
                      <span className={styles.hopMs}>{hop.latencyMs.toFixed(1)}ms</span>
                      <div className={styles.hopBarTrack}>
                        <div
                          className={styles.hopBarFill}
                          style={{
                            width: `${Math.max(5, (hop.latencyMs / maxHopLatency) * 100)}%`,
                            backgroundColor: isSlowest
                              ? 'var(--warning)'
                              : hop.status === 'error'
                              ? 'var(--error)'
                              : 'var(--accent-primary)',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      className={styles.inspectBtn}
                      onClick={() => {
                        selectNode(hop.nodeId);
                        setIsPropertiesPanelOpen(true);
                      }}
                      title="Inspect node configuration"
                    >
                      <Eye size={12} />
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
