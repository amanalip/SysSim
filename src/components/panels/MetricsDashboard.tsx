import React, { useState } from 'react';
import {
  Activity,
  X,
  Download,
  Table,
  LineChart as LineChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useStore } from '../../store/use-store';
import { BottleneckPanel } from './BottleneckPanel';
import styles from './MetricsDashboard.module.css';

export const MetricsDashboard: React.FC = () => {
  const {
    metrics,
    isBottomDrawerOpen,
    setIsBottomDrawerOpen,
    activeBottomTab,
    setActiveBottomTab,
  } = useStore();

  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');

  if (!isBottomDrawerOpen) return null;

  const handleExportCsv = () => {
    const headers = [
      'TimestampSec',
      'P50LatencyMs',
      'P95LatencyMs',
      'P99LatencyMs',
      'ThroughputQPS',
      'ErrorRatePercent',
      'CacheHitRatioPercent',
    ];
    const rows = metrics.timeSeries.map((d) => [
      d.timestampSec,
      d.p50LatencyMs,
      d.p95LatencyMs,
      d.p99LatencyMs,
      d.throughputQps,
      d.errorRatePercent,
      d.cacheHitRatioPercent,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

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
              Bottleneck Inspector
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
            title="Close metrics panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className={styles.drawerBody}>
        {activeBottomTab === 'bottlenecks' ? (
          <BottleneckPanel />
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className={styles.summaryCardsGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total Requests</span>
                <span className={styles.summaryValue}>{metrics.totalRequestsSent}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Success Rate</span>
                <span className={styles.summaryValue} style={{ color: 'var(--success)' }}>
                  {metrics.totalRequestsSent > 0
                    ? `${Math.round(
                        (metrics.totalRequestsSuccess / metrics.totalRequestsSent) * 100
                      )}%`
                    : '100%'}
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
            </div>

            {/* Dynamic Views: Charts vs Per-Component Table */}
            {viewMode === 'charts' ? (
              <div className={styles.chartsGrid}>
                {/* Latency Percentiles Chart */}
                <div className={styles.chartContainer}>
                  <span className={styles.chartTitle}>Latency Percentiles (ms)</span>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={metrics.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="timestampSec" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-primary)',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="p50LatencyMs"
                        name="p50"
                        stroke="#58a6ff"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="p95LatencyMs"
                        name="p95"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="p99LatencyMs"
                        name="p99"
                        stroke="#f85149"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Throughput & Errors Chart */}
                <div className={styles.chartContainer}>
                  <span className={styles.chartTitle}>Throughput & Error Rate</span>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={metrics.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="timestampSec" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-primary)',
                          fontSize: '11px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="throughputQps"
                        name="Throughput (QPS)"
                        stroke="#3fb950"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="errorRatePercent"
                        name="Error Rate (%)"
                        stroke="#f85149"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.componentTable}>
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Type</th>
                      <th>Total Requests</th>
                      <th>QPS</th>
                      <th>Avg Latency</th>
                      <th>p95 Latency</th>
                      <th>Error %</th>
                      <th>Queue Depth</th>
                      <th>Cache Hit %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            textAlign: 'center',
                            padding: '32px 16px',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                          }}
                        >
                          Start simulation playback to collect per-component metrics
                        </td>
                      </tr>
                    ) : (
                      compList.map((c) => (
                        <tr key={c.nodeId}>
                          <td>{c.nodeName}</td>
                          <td>{c.nodeType}</td>
                          <td>{c.totalRequests}</td>
                          <td>{c.qps}</td>
                          <td>{c.avgLatencyMs}ms</td>
                          <td>{c.p95LatencyMs}ms</td>
                          <td
                            style={{
                              color: c.errorRatePercent > 0 ? 'var(--error)' : 'inherit',
                            }}
                          >
                            {c.errorRatePercent}%
                          </td>
                          <td>{c.queueDepth}</td>
                          <td>{c.cacheHitRatioPercent}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
