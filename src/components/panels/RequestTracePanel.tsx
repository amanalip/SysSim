import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Network, AlertTriangle, Eye } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { RequestHop, SimRequest } from '../../model/types';
import { ComponentIcon } from '../icons/ComponentIcon';
import { ModelNotice } from '../ui/ModelNotice';
import styles from './RequestTracePanel.module.css';
import { formatSimulationDuration } from '../../platform/time';

const CACHE_TYPES = new Set(['cdn', 'redis_cache', 'local_cache', 'cdn_cache', 'browser_cache']);

function getCacheStateLabel(hop: RequestHop): string | null {
  if (!CACHE_TYPES.has(hop.nodeType)) return null;
  if (hop.info?.includes('bypassing')) return 'BYPASS';
  if (hop.info?.includes('coalesced')) return 'COALESCED';
  if (hop.status === 'hit') return 'HIT';
  if (hop.status === 'miss') return 'MISS → ORIGIN';
  return null;
}

export const RequestTracePanel: React.FC = () => {
  const { recentRequests, selectNode, setIsPropertiesPanelOpen } = useStore(
    useShallow((state) => ({
      recentRequests: state.recentRequests,
      selectNode: state.selectNode,
      setIsPropertiesPanelOpen: state.setIsPropertiesPanelOpen,
    })),
  );
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');
  const [timeWindowMs, setTimeWindowMs] = useState(0);

  const latestTimestamp = recentRequests.at(-1)?.timestamp ?? 0;
  const traces = useMemo(
    () =>
      recentRequests
        .filter((trace) => statusFilter === 'all' || trace.status === statusFilter)
        .filter((trace) =>
          routeFilter.trim()
            ? trace.path
                .map((hop) => hop.nodeName)
                .join(' → ')
                .toLowerCase()
                .includes(routeFilter.trim().toLowerCase())
            : true,
        )
        .filter((trace) =>
          nodeFilter.trim()
            ? trace.path.some(
                (hop) =>
                  hop.nodeName.toLowerCase().includes(nodeFilter.trim().toLowerCase()) ||
                  hop.nodeType.toLowerCase().includes(nodeFilter.trim().toLowerCase()),
              )
            : true,
        )
        .filter((trace) => timeWindowMs === 0 || trace.timestamp >= latestTimestamp - timeWindowMs)
        .slice(-100)
        .reverse(),
    [recentRequests, statusFilter, routeFilter, nodeFilter, timeWindowMs, latestTimestamp],
  );
  const selectedTrace: SimRequest | undefined =
    traces.find((t) => t.id === selectedTraceId) || traces[0];

  if (traces.length === 0) {
    return (
      <div className={styles.tracePanel}>
        <ModelNotice
          kind="simulation"
          detail="Traces are synthetic model paths, not telemetry captured from a deployed system."
          assumptionLabel="request and hop model"
          assumptionSection="what-the-simulation-represents"
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
  const totalLatency =
    selectedTrace?.totalLatencyMs || hops.reduce((acc, h) => acc + h.latencyMs, 0);

  return (
    <div className={styles.tracePanel}>
      <ModelNotice
        kind="simulation"
        detail="Traces are synthetic model paths, not telemetry captured from a deployed system."
        assumptionLabel="request and hop model"
        assumptionSection="what-the-simulation-represents"
      />
      <div className={styles.traceContainer}>
        {/* Left List of Traces */}
        <div className={styles.traceList}>
          <div className={styles.listHeader}>
            <span>Recorded Traces ({traces.length})</span>
            <div className={styles.filters}>
              <select
                aria-label="Filter traces by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="timeout">Timeout</option>
                <option value="blocked">Blocked</option>
                <option value="rate_limited">Rate limited</option>
                <option value="dropped">Dropped</option>
              </select>
              <input
                aria-label="Filter traces by route"
                placeholder="Route…"
                value={routeFilter}
                onChange={(event) => setRouteFilter(event.target.value)}
              />
              <input
                aria-label="Filter traces by node"
                placeholder="Node…"
                value={nodeFilter}
                onChange={(event) => setNodeFilter(event.target.value)}
              />
              <select
                aria-label="Filter traces by simulation time"
                value={timeWindowMs}
                onChange={(event) => setTimeWindowMs(Number(event.target.value))}
              >
                <option value={0}>All modeled time</option>
                <option value={10_000}>Last 10 sim seconds</option>
                <option value={30_000}>Last 30 sim seconds</option>
                <option value={60_000}>Last 60 sim seconds</option>
              </select>
            </div>
          </div>
          <div className={styles.listBody}>
            {traces.length === 0 && (
              <p className={styles.noMatches}>No traces match these filters.</p>
            )}
            {traces.map((trace) => {
              const isSelected = trace.id === (selectedTrace?.id || traces[0]?.id);
              const isSuccess = trace.status === 'success';
              const isRateLimited = trace.status === 'rate_limited';
              const isBlocked = trace.status === 'blocked';

              return (
                <button
                  type="button"
                  key={trace.id}
                  className={`${styles.traceItem} ${isSelected ? styles.traceItemActive : ''}`}
                  onClick={() => setSelectedTraceId(trace.id)}
                  aria-pressed={isSelected}
                >
                  <div className={styles.traceItemTop}>
                    <span
                      className={`${styles.statusPill} ${
                        isSuccess
                          ? styles.statusSuccess
                          : isRateLimited || isBlocked
                            ? styles.statusWarning
                            : styles.statusError
                      }`}
                    >
                      {isSuccess
                        ? '200 OK'
                        : isRateLimited
                          ? '429 Limit'
                          : isBlocked
                            ? '403 Blocked'
                            : '500 Error'}
                    </span>
                    <span className={styles.traceLatency}>{trace.totalLatencyMs.toFixed(1)}ms</span>
                  </div>
                  <div className={styles.traceItemBottom}>
                    <span className={styles.traceHopsCount}>{trace.path.length} hops</span>
                    <span className={styles.traceTime}>
                      t+{formatSimulationDuration(trace.timestamp)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Trace Waterfall Inspector */}
        {selectedTrace && (
          <div className={styles.waterfallView}>
            <div className={styles.waterfallHeader}>
              <div className={styles.traceOverview}>
                <span>Seed {selectedTrace.simulationSeed ?? 'not recorded'}</span>
                <span className={styles.waterfallTitle}>
                  Trace #{selectedTrace.id.slice(0, 12)}
                </span>
                <span className={styles.waterfallMeta}>
                  Total Latency: <b>{totalLatency.toFixed(1)}ms</b> • Hops: <b>{hops.length}</b> •
                  Status: <b>{selectedTrace.status}</b> • Key:{' '}
                  <b>{selectedTrace.requestKey || 'legacy'}</b>
                </span>
              </div>
            </div>

            <div className={styles.hopsList}>
              {hops.map((hop, idx) => {
                const hopPercent = Math.round((hop.latencyMs / Math.max(1, totalLatency)) * 100);
                const isSlowest = hop.latencyMs === maxHopLatency && hops.length > 1;
                const cacheStateLabel = getCacheStateLabel(hop);

                return (
                  <div
                    key={idx}
                    className={`${styles.hopCard} ${isSlowest ? styles.hopCardBottleneck : ''}`}
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
                          {cacheStateLabel ? (
                            <span
                              className={`${styles.cacheStatePill} ${
                                cacheStateLabel === 'HIT'
                                  ? styles.cacheStateHit
                                  : styles.cacheStateMiss
                              }`}
                            >
                              {cacheStateLabel}
                            </span>
                          ) : null}
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
