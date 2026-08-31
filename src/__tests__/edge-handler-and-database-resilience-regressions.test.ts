import { describe, it, expect } from 'vitest';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { CanvasEdge, CanvasNode } from '../store/use-store';
import { createDefaultConfig } from '../model/component-defaults';

describe('Deep Fixes Batch 4: Protocol Edge Handler Integrity & High-Throughput DB SPOF Severity', () => {
  it('Fix 8: Upgrades Database SPOF to critical severity when processing over 2,000 QPS on a single primary', () => {
    const dbNode: CanvasNode = {
      id: 'sql_1',
      type: 'customComponent',
      position: { x: 200, y: 200 },
      data: {
        config: {
          ...createDefaultConfig('sql_db', 'sql_1', 'Postgres Primary'),
          readReplicasCount: 0,
        } as any,
      },
    };
    const clientNode: CanvasNode = {
      id: 'client',
      type: 'customComponent',
      position: { x: 0, y: 200 },
      data: { config: createDefaultConfig('client', 'client', 'Client') },
    };
    const route: CanvasEdge = {
      id: 'client-db',
      source: 'client',
      target: 'sql_1',
      data: { protocol: 'HTTP', purpose: 'request' },
    };

    // Low load: warning severity
    const lowLoadIssues = detectBottlenecks([clientNode, dbNode], [route], {
      totalRequestsSent: 500,
      totalRequestsSuccess: 500,
      totalRequestsFailed: 0,
      currentQps: 500,
      avgEndToEndLatencyMs: 15,
      p50LatencyMs: 10,
      p95LatencyMs: 15,
      p99LatencyMs: 25,
      overallErrorRatePercent: 0,
      overallCacheHitRatioPercent: 0,
      timeSeries: [],
      componentMetrics: {
        sql_1: {
          nodeId: 'sql_1',
          nodeName: 'Postgres Primary',
          qps: 500,
          avgLatencyMs: 15,
          errorRatePercent: 0,
          activeConnections: 10,
        } as any,
      },
    });

    const lowDbSpof = lowLoadIssues.find((i) => i.id === 'spof_db_sql_1');
    expect(lowDbSpof?.severity).toBe('warning');

    // High load (> 2000 QPS): critical severity
    const highLoadIssues = detectBottlenecks([clientNode, dbNode], [route], {
      totalRequestsSent: 3500,
      totalRequestsSuccess: 3500,
      totalRequestsFailed: 0,
      currentQps: 3500,
      avgEndToEndLatencyMs: 80,
      p50LatencyMs: 60,
      p95LatencyMs: 80,
      p99LatencyMs: 150,
      overallErrorRatePercent: 0,
      overallCacheHitRatioPercent: 0,
      timeSeries: [],
      componentMetrics: {
        sql_1: {
          nodeId: 'sql_1',
          nodeName: 'Postgres Primary',
          qps: 3500,
          avgLatencyMs: 80,
          errorRatePercent: 0,
          activeConnections: 95,
        } as any,
      },
    });

    const highDbSpof = highLoadIssues.find((i) => i.id === 'spof_db_sql_1');
    expect(highDbSpof?.severity).toBe('critical');
    expect(highDbSpof?.title).toBe('Critical Database Contention SPOF');
  });
});
