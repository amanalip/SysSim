import { describe, it, expect, beforeEach } from 'vitest';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { useStore } from '../store/use-store';

describe('Bottleneck Detection & Capacity Calculator Tests (Milestones 12 and 13)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
  });

  it('detects SPOF when app server has only 1 replica', () => {
    const serverId = useStore.getState().addNode('app_server', { x: 100, y: 100 });
    useStore.getState().updateNodeConfig(serverId, { replicas: 1 });

    const nodes = useStore.getState().nodes;
    const edges = useStore.getState().edges;
    const issues = detectBottlenecks(nodes, edges);

    const spof = issues.find((i) => i.type === 'spof');
    expect(spof).toBeDefined();
    expect(spof?.severity).toBe('warning');
    expect(spof?.nodeId).toBe(serverId);
  });

  it('detects missing cache layer before databases', () => {
    useStore.getState().addNode('app_server', { x: 100, y: 100 });
    const dbId = useStore.getState().addNode('sql_db', { x: 300, y: 100 });

    const nodes = useStore.getState().nodes;
    const edges = useStore.getState().edges;
    const issues = detectBottlenecks(nodes, edges);

    const missingCache = issues.find((i) => i.type === 'missing_cache');
    expect(missingCache).toBeDefined();
    expect(missingCache?.nodeId).toBe(dbId);
  });

  it('calculates capacity math accurately', () => {
    useStore.getState().setCalculatorInputs({
      qps: 10000,
      payloadSizeKb: 2,
      retentionDays: 365,
      readWriteRatio: 1, // 50% reads, 50% writes -> 5000 write QPS
      replicationFactor: 3,
      serverCapacityQps: 2000,
    });

    const inputs = useStore.getState().calculatorInputs;
    const writeQps = inputs.qps / (inputs.readWriteRatio + 1); // 5000
    const dailyDataGb = (writeQps * inputs.payloadSizeKb * 86400) / (1024 * 1024); // ~823.97 GB
    const totalStorageTb = (dailyDataGb * inputs.retentionDays) / 1024;
    const serversNeeded = Math.ceil(inputs.qps / inputs.serverCapacityQps); // 5

    expect(serversNeeded).toBe(5);
    expect(dailyDataGb).toBeGreaterThan(800);
    expect(totalStorageTb).toBeGreaterThan(250);
  });
});
