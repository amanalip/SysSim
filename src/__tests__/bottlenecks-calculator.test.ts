import { describe, it, expect, beforeEach } from 'vitest';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { useStore } from '../store/use-store';
import { calculateCapacity } from '../analysis/capacity-calculator';

describe('Bottleneck Detection & Capacity Calculator Tests (Milestones 12 and 13)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
  });

  it('detects SPOF when app server has only 1 replica', () => {
    const clientId = useStore.getState().addNode('client', { x: 0, y: 100 });
    const serverId = useStore.getState().addNode('app_server', { x: 100, y: 100 });
    const databaseId = useStore.getState().addNode('sql_db', { x: 200, y: 100 });
    useStore.getState().updateNodeConfig(serverId, { replicas: 1 });
    useStore.getState().addEdge(clientId, serverId);
    useStore.getState().addEdge(serverId, databaseId);

    const nodes = useStore.getState().nodes;
    const edges = useStore.getState().edges;
    const issues = detectBottlenecks(nodes, edges);

    const spof = issues.find((i) => i.type === 'spof');
    expect(spof).toBeDefined();
    expect(spof?.severity).toBe('warning');
    expect(spof?.nodeId).toBe(serverId);
  });

  it('detects missing cache layer before databases', () => {
    const clientId = useStore.getState().addNode('client', { x: 0, y: 100 });
    const serverId = useStore.getState().addNode('app_server', { x: 100, y: 100 });
    const dbId = useStore.getState().addNode('sql_db', { x: 300, y: 100 });
    useStore.getState().addEdge(clientId, serverId);
    useStore.getState().addEdge(serverId, dbId);

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

    const output = calculateCapacity(useStore.getState().calculatorInputs);
    expect(output.estimatedServersNeeded).toBe(10);
    expect(output.dailyNewDataGb).toBe(864);
    expect(output.totalReplicatedStorageTb).toBeGreaterThan(800);
  });
});
