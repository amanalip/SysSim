import React, { useState } from 'react';
import {
  Activity,
  X,
  Download,
  Table,
  LineChart as LineChartIcon,
  ChevronUp,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useStore } from '../../store/use-store';
import { BottleneckPanel } from './BottleneckPanel';
import { HealthRadarPanel } from './HealthRadarPanel';
import { RequestTracePanel } from './RequestTracePanel';
import { CostEstimatorPanel } from './CostEstimatorPanel';
import { ModelNotice } from '../ui/ModelNotice';
import { buildMetricsCsv } from '../../utils/metrics-export';
import styles from './MetricsDashboard.module.css';

export const MetricsDashboard: React.FC = () => {
  const {
    metrics,
    isBottomDrawerOpen,
    setIsBottomDrawerOpen,
    activeBottomTab,
    setActiveBottomTab,
    bottlenecks,
  } = useStore();

  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');

  // Closed state: render a sleek persistent mini-ticker bar
  if (!isBottomDrawerOpen) {
    const successPercent =
      metrics.totalRequestsSent > 0
        ? ((metrics.totalRequestsSuccess / metrics.totalRequestsSent) * 100).toFixed(2)
        : '100.00';

    return (
      <div
        className={styles.miniTickerBar}
        onClick={() => setIsBottomDrawerOpen(true)}
        title="Click to open full Metrics & Telemetry Dashboard (M)"
      >
        <div className={styles.miniTickerLeft}>
          <div className={styles.miniPulseDot} />
          <span className={styles.miniTitle}>Simulated Telemetry</span>
          <span className={styles.modelBadge}>Illustrative</span>
          <div className={styles.miniDivider} />

          <div className={styles.miniStatItem}>
            <Zap size={11} color="var(--accent-primary)" />
            <span className={styles.miniStatLabel}>QPS:</span>
            <span className={styles.miniStatVal}>{metrics.currentQps}</span>
          </div>

          <div className={styles.miniStatItem}>
            <CheckCircle2 size={11} color="var(--success)" />
            <span className={styles.miniStatLabel}>Success:</span>
            <span className={styles.miniStatVal} style={{ color: 'var(--success)' }}>
              {successPercent}%
            </span>
          </div>

          <div className={styles.miniStatItem}>
            <Clock size={11} color="var(--warning)" />
            <span className={styles.miniStatLabel}>p99:</span>
            <span className={styles.miniStatVal}>{metrics.p99LatencyMs}ms</span>
          </div>

          {bottlenecks.length > 0 && (
            <div className={styles.miniBottleneckPill}>
              <AlertTriangle size={11} color="#ffffff" />
              <span>{bottlenecks.length} Bottleneck{bottlenecks.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className={styles.miniTickerRight}>
          <span className={styles.expandLabel}>Expand Telemetry</span>
          <ChevronUp size={14} />
        </div>
      </div>
    );
  }

  const handleExportCsv = () => {
    if (!metrics.timeSeries || metrics.timeSeries.length === 0) {
      useStore.getState().addToast('No simulation metrics recorded yet to export', 'warning');
      return;
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      buildMetricsCsv(metrics.timeSeries);

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `syssim_metrics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const compList = Object.values(metrics.componentMetrics);

  return (
    <div className={styles.drawerContainer}>
      <div className={styles.drawerHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>
            <Activity size={16} color="var(--accent-primary)" />
            <span>Simulation Metrics & Telemetry</span>
          </div>

          <div className={styles.subTabs}>
            <button
              className={`${styles.tabBtn} ${
                activeBottomTab === 'metrics' ? styles.tabBtnActive : ''
              }`}
              onClick={() => setActiveBottomTab('metrics')}
            >
              Real-Time Metrics
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeBottomTab === 'bottlenecks' ? styles.tabBtnActive : ''
              }`}
              onClick={() => setActiveBottomTab('bottlenecks')}
            >
              Bottleneck Inspector {bottlenecks.length > 0 && `(${bottlenecks.length})`}
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeBottomTab === 'health' ? styles.tabBtnActive : ''
              }`}
              onClick={() => setActiveBottomTab('health')}
            >
              5-Pillar Health Radar
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeBottomTab === 'trace' ? styles.tabBtnActive : ''
              }`}
              onClick={() => setActiveBottomTab('trace')}
            >
              Distributed Traces
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeBottomTab === 'cost' ? styles.tabBtnActive : ''
              }`}
              onClick={() => setActiveBottomTab('cost')}
            >
              Cloud Cost Estimator
            </button>
          </div>
        </div>

        <div className={styles.headerRight}>
          {activeBottomTab === 'metrics' && (
            <>
              <button
                className={styles.btn}
                onClick={() => setViewMode(viewMode === 'charts' ? 'table' : 'charts')}
                title="Toggle Charts or Table View"
              >
                {viewMode === 'charts' ? <Table size={13} /> : <LineChartIcon size={13} />}
                <span>{viewMode === 'charts' ? 'Table View' : 'Charts View'}</span>
              </button>

              <button
                className={styles.btn}
                onClick={handleExportCsv}
                disabled={metrics.timeSeries.length === 0}
                title="Export metrics time series as CSV"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </>
          )}

          <button
            className={styles.closeBtn}
            onClick={() => setIsBottomDrawerOpen(false)}
            title="Minimize metrics panel (M)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className={styles.drawerBody}>
        {activeBottomTab === 'metrics' && (
          <ModelNotice
            kind="simulation"
            detail="Telemetry is generated by SysSim's synthetic model, not observed production traffic."
            assumptionLabel="synthetic request model"
            assumptionSection="what-the-simulation-represents"
          />
        )}
        {activeBottomTab === 'bottlenecks' && <BottleneckPanel />}
        {activeBottomTab === 'metrics' && (
          <>
            {/* KPI Summary Cards */}
            <div className={styles.summaryCardsGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total Requests</span>
                <span className={styles.summaryValue}>{metrics.totalRequestsSent.toLocaleString()}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Request / Acceptance Success</span>
                <span className={styles.summaryValue} style={{ color: 'var(--success)' }}>
                  {metrics.totalRequestsSent > 0
                    ? `${(
                        (metrics.totalRequestsSuccess / metrics.totalRequestsSent) *
                        100
                      ).toFixed(2)}%`
                    : '100.00%'}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>p50 Latency</span>
                <span className={styles.summaryValue}>{metrics.p50LatencyMs}ms</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>p95 Latency</span>
                <span className={styles.summaryValue}>{metrics.p95LatencyMs}ms</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>p99 Latency</span>
                <span className={styles.summaryValue}>{metrics.p99LatencyMs}ms</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Error Rate</span>
                <span
                  className={styles.summaryValue}
                  style={{
                    color:
                      metrics.overallErrorRatePercent > 0
                        ? 'var(--error)'
                        : 'var(--text-primary)',
                  }}
                >
                  {metrics.overallErrorRatePercent}%
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Cache Hit Ratio</span>
                <span className={styles.summaryValue} style={{ color: 'var(--accent-primary)' }}>
                  {metrics.overallCacheHitRatioPercent}%
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Producer Accepted</span>
                <span className={styles.summaryValue}>{(metrics.totalProducerAccepted || 0).toLocaleString()}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Consumer Succeeded</span>
                <span className={styles.summaryValue}>{(metrics.totalConsumerSucceeded || 0).toLocaleString()}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Retries / Dropped</span>
                <span className={styles.summaryValue}>
                  {(metrics.totalMessageRetries || 0).toLocaleString()} / {(metrics.totalMessagesDropped || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Dynamic Views: Charts vs Per-Component Table */}
            {viewMode === 'charts' ? (
              <div className={styles.chartsGrid}>
                {/* Latency Percentiles Area Chart */}
                <div className={styles.chartContainer}>
                  <span className={styles.chartTitle}>Latency Percentiles (ms)</span>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={metrics.timeSeries}>
                      <defs>
                        <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#58a6ff" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="p99Grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f85149" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f85149" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="timestampSec" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-primary)',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="p50LatencyMs"
                        name="p50 (ms)"
                        stroke="#58a6ff"
                        strokeWidth={1.5}
                        fill="url(#p50Grad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="p95LatencyMs"
                        name="p95 (ms)"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        fill="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="p99LatencyMs"
                        name="p99 (ms)"
                        stroke="#f85149"
                        strokeWidth={1.5}
                        fill="url(#p99Grad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Throughput & Errors Area Chart */}
                <div className={styles.chartContainer}>
                  <span className={styles.chartTitle}>Throughput & Error Rate</span>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={metrics.timeSeries}>
                      <defs>
                        <linearGradient id="qpsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3fb950" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3fb950" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f85149" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f85149" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="timestampSec" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-primary)',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="throughputQps"
                        name="Throughput (QPS)"
                        stroke="#3fb950"
                        strokeWidth={1.5}
                        fill="url(#qpsGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="errorRatePercent"
                        name="Error Rate (%)"
                        stroke="#f85149"
                        strokeWidth={1.5}
                        fill="url(#errGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              /* Per-Component Metrics Breakdown Table */
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Node</th>
                      <th>Type</th>
                      <th>Throughput</th>
                      <th>Utilization %</th>
                      <th>Active Conns</th>
                      <th>p95 Latency</th>
                      <th>Error Rate</th>
                      <th>Requests / Accepted</th>
                      <th>Dropped</th>
                      <th>Cache H/M/B/C</th>
                      <th>Messaging A/R · C✓/C✕ · Retry/Drop · Age</th>
                      <th>Compute Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compList.length === 0 ? (
                      <tr>
                        <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No component telemetry recorded yet. Start simulation to observe metrics.
                        </td>
                      </tr>
                    ) : (
                      compList.map((c) => (
                        <tr key={c.nodeId}>
                          <td style={{ fontWeight: 600 }}>{c.nodeName}</td>
                          <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                            {c.nodeType.replace('_', ' ')}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.qps} QPS</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            <span
                              style={{
                                color:
                                  c.utilizationPercent > 85
                                    ? 'var(--error)'
                                    : c.utilizationPercent > 60
                                    ? 'var(--warning)'
                                    : 'var(--text-primary)',
                                fontWeight: c.utilizationPercent > 60 ? 700 : 400,
                              }}
                            >
                              {c.utilizationPercent}%
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.activeConnections}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.p95LatencyMs}ms</td>
                          <td
                            style={{
                              color: c.errorRatePercent > 0 ? 'var(--error)' : 'var(--text-primary)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {c.errorRatePercent}%
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.totalRequests.toLocaleString()}</td>
                          <td
                            style={{
                              color: c.failedRequests > 0 ? 'var(--error)' : 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {c.failedRequests.toLocaleString()}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {c.cacheHits || 0}/{c.cacheMisses || 0}/{c.cacheBypasses || 0}/{c.cacheCoalescedRequests || 0}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {c.producerAccepted === undefined
                              ? '—'
                              : `${c.producerAccepted}/${c.producerRejected || 0} · ${c.consumerSucceeded || 0}/${c.consumerFailed || 0} · ${c.messageRetries || 0}/${c.messagesDropped || 0} · ${Math.round(c.messageQueueAgeMs || 0)}ms`}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {c.nodeType === 'app_server'
                              ? `CPU ${c.cpuUtilizationPercent || 0}% · queue ${c.queueDepth}`
                              : c.nodeType === 'worker'
                                ? `busy ${c.busyWorkers || 0} · queue ${c.queuedWork || 0} · ${Math.round(c.workerProcessingLatencyMs || 0)}ms · retry ${c.workerRetries || 0}`
                                : c.nodeType === 'serverless'
                                  ? `cold/warm ${c.coldStarts || 0}/${c.warmStarts || 0} · timeout ${c.serverlessTimeouts || 0} · P(cold) ${c.coldStartProbabilityPercent || 0}%`
                                  : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeBottomTab === 'health' && <HealthRadarPanel />}
        {activeBottomTab === 'trace' && <RequestTracePanel />}
        {activeBottomTab === 'cost' && <CostEstimatorPanel />}
      </div>
    </div>
  );
};
