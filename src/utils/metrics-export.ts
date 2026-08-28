import { TimeSeriesDataPoint } from '../model/types';

export function buildMetricsCsv(timeSeries: TimeSeriesDataPoint[]): string {
  const headers = [
    'TimestampSec',
    'P50LatencyMs',
    'P95LatencyMs',
    'P99LatencyMs',
    'ThroughputQPS',
    'ErrorRatePercent',
    'CacheHitRatioPercent',
    'CacheHits',
    'CacheMisses',
    'CacheBypasses',
    'CacheCoalescedRequests',
  ];
  const rows = timeSeries.map((point) => [
    point.timestampSec,
    point.p50LatencyMs,
    point.p95LatencyMs,
    point.p99LatencyMs,
    point.throughputQps,
    point.errorRatePercent,
    point.cacheHitRatioPercent,
    point.cacheHits || 0,
    point.cacheMisses || 0,
    point.cacheBypasses || 0,
    point.cacheCoalescedRequests || 0,
  ]);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
