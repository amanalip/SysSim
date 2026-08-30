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
        : null;

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
            <span className={styles.miniStatLabel}>Completed QPS:</span>
            <span className={styles.miniStatVal}>{metrics.completedThroughputQps ?? metrics.currentQps}</span>
          </div>

          <div className={styles.miniStatItem}>
            <CheckCircle2 size={11} color="var(--success)" />
            <span className={styles.miniStatLabel}>Success:</span>
            <span className={styles.miniStatVal} style={{ color: 'var(--success)' }}>
              {successPercent === null ? '--' : `${successPercent}%`}
            </span>
          </div>

          <div className={styles.miniStatItem}>
            <Clock size={11} color="var(--warning)" />
            <span className={styles.miniStatLabel}>p99:</span>
            <span className={styles.miniStatVal}>{successPercent === null ? '--' : `${metrics.p99LatencyMs}ms`}</span>
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
                <span className={styles.summaryLabel}>Lifetime Offered / Accepted</span>
                <span className={styles.summaryValue}>{(metrics.totalRequestsOffered || 0).toLocaleString()} / {(metrics.totalRequestsAccepted ?? metrics.totalRequestsSent).toLocaleString()}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Lifetime Completed / Dropped</span>
                <span className={styles.summaryValue}>{(metrics.totalRequestsCompleted || 0).toLocaleString()} / {(metrics.totalRequestsDropped || 0).toLocaleString()}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Recent Successful p50</span>
                <span className={styles.summaryValue}>{metrics.totalRequestsSuccess > 0 ? `${metrics.p50LatencyMs}ms` : '--'}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Recent Successful p95</span>
                <span className={styles.summaryValue}>{metrics.totalRequestsSuccess > 0 ? `${metrics.p95LatencyMs}ms` : '--'}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Recent Successful p99</span>
                <span className={styles.summaryValue}>{metrics.totalRequestsSuccess > 0 ? `${metrics.p99LatencyMs}ms` : '--'}</span>
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
                <span className={styles.summaryLabel}>Latest Offered / Accepted QPS</span>
                <span className={styles.summaryValue}>{metrics.offeredLoadQps || 0} / {metrics.acceptedLoadQps || 0}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Latest Completed / Dropped QPS</span>
                <span className={styles.summaryValue}>{metrics.completedThroughputQps || 0} / {metrics.droppedLoadQps || 0}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Recent Success / Failure Avg</span>
                <span className={styles.summaryValue}>{metrics.successfulAvgLatencyMs || 0}ms / {metrics.failedAvgLatencyMs || 0}ms</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Queue / Service / Network Avg</span>
                <span className={styles.summaryValue}>{metrics.avgQueueWaitMs || 0} / {metrics.avgServiceTimeMs || 0} / {metrics.avgNetworkTimeMs || 0}ms</span>
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
                      <th>Lifetime Avg Throughput</th>
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
                                  ? `cold/warm ${c.coldStarts || 0}/${c.warmStarts || 0} · throttle ${c.serverlessThrottles || 0} · timeout ${c.serverlessTimeouts || 0} · invoke/downstream fail ${c.serverlessInvocationFailures || 0}/${c.serverlessDownstreamFailures || 0} · P(cold) ${c.coldStartProbabilityPercent || 0}%`
                                  : c.nodeType === 'load_balancer'
                                    ? `unhealthy ${c.loadBalancerUnhealthyTargets || 0} · unavailable ${c.loadBalancerUnavailableFailures || 0} · skew ${c.loadBalancerDistributionSkewPercent || 0}%`
                                    : c.nodeType === 'api_gateway'
                                      ? `throttle ${c.apiGatewayThrottles || 0} · timeout ${c.apiGatewayTimeouts || 0} · circuit ${c.apiGatewayCircuitState || 'closed'} (${c.apiGatewayOpenCircuitRejections || 0} rejected)`
                                      : c.nodeType === 'cdn'
                                        ? `offload/fetch ${c.cdnOriginOffloadedRequests || 0}/${c.cdnOriginFetches || 0} · origin ${c.cdnOriginFetchLatencyMs || 0}ms · egress ${Math.round(c.cdnOriginEgressKb || 0)}KB`
                                        : c.nodeType === 'dns'
                                          ? `DNS hit/miss ${c.dnsCacheHits || 0}/${c.dnsCacheMisses || 0} · fail ${c.dnsResolutionFailures || 0}`
                                          : c.nodeType === 'firewall'
                                            ? `blocked ${c.wafBlockedRequests || 0} · infra fail ${c.wafInfrastructureFailures || 0}`
                                            : c.nodeType === 'reverse_proxy'
                                              ? `reject ${c.reverseProxyRejectedConnections || 0} · saved ${c.reverseProxyCompressedKbSaved || 0}KB · backpressure ${c.reverseProxyBackpressureMs || 0}ms`
                                              : c.nodeType === 'sql_db'
                                                ? `read/write ${c.sqlReads || 0}/${c.sqlWrites || 0} · primary/replica ${c.sqlPrimaryQueries || 0}/${c.sqlReplicaQueries || 0} · wait/reject ${c.sqlConnectionWaits || 0}/${c.sqlConnectionRejections || 0} · lag ${c.sqlReplicationLagMs || 0}ms · failover ${c.sqlFailovers || 0} · hot +${c.sqlHotPartitionPercent || 0}%`
                                                : c.nodeType === 'nosql_db'
                                                  ? `read/write ${c.nosqlReads || 0}/${c.nosqlWrites || 0} · quorum R${c.nosqlReadQuorum || 0}/W${c.nosqlWriteQuorum || 0} · lag ${c.nosqlReplicationLagMs || 0}ms · hot +${c.nosqlHotPartitionPercent || 0}%`
                                                  : c.nodeType === 'object_storage'
                                                    ? `request/transfer ${c.objectStorageRequestLatencyMs || 0}/${c.objectStorageTransferLatencyMs || 0}ms · ${Math.round(c.objectStorageTransferredKb || 0)}KB`
                                                    : c.nodeType === 'search_index'
                                                      ? `query/index ${c.searchQueries || 0}/${c.searchIndexWrites || 0} · imbalance +${c.searchShardImbalancePercent || 0}%`
                                                      : c.nodeType === 'graph_db'
                                                        ? `depth ${c.graphTraversalDepth || 0} · capacity ${c.graphEffectiveCapacityQps || 0}/s · limited/rejected ${c.graphDepthLimitedQueries || 0}/${c.graphCapacityRejectedQueries || 0}`
                                                        : c.nodeType === 'timeseries_db'
                                                          ? `writes accepted/rejected ${c.timeSeriesAcceptedWrites || 0}/${c.timeSeriesRejectedWrites || 0} · queries ${c.timeSeriesQueries || 0} · retention ${c.timeSeriesRetentionDays || 0}d · cold ${c.timeSeriesColdTierQueries || 0} (${c.timeSeriesColdTierLatencyFactor || 1}×)`
                                                          : c.nodeType === 'rate_limiter'
                                                            ? `accepted/rejected ${c.rateLimiterAccepted || 0}/${c.rateLimiterRejected || 0} · queued ${c.rateLimiterQueued || 0} · decision ${c.rateLimiterDecisionLatencyMs || 0}ms`
                                                            : c.nodeType === 'auth_service'
                                                              ? `session cache hit/miss ${c.authCacheHits || 0}/${c.authCacheMisses || 0} · validation ${c.authValidationLatencyMs || 0}ms`
                                                              : c.nodeType === 'encryption_service'
                                                                ? `operations ${c.encryptionOperations || 0} · latency ${c.encryptionLatencyMs || 0}ms · payload ${Math.round(c.encryptedPayloadKb || 0)}KB`
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
