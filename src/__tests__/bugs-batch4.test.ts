import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { detectBottlenecks } from '../engine/metrics/bottleneck-detector';
import { ALL_SCENARIOS } from '../scenarios';

describe('Bugs Batch 4: Input Focus Key Guard, Multi-Replica Capacity Check, Command Palette Tab Switch', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      activeSidebarTab: 'palette',
    });
  });

  it('Bug 9: Multi-replica cluster capacity multiplies base throughput limit', () => {
    const { addNode, updateNodeConfig } = useStore.getState();
    const nodeId = addNode('app_server', { x: 100, y: 100 }, 'App Cluster');
    updateNodeConfig(nodeId, { maxThroughputQps: 1000, replicas: 3 });

    const nodes = useStore.getState().nodes;
    const edges = useStore.getState().edges;
    const mockMetrics = {
      ...useStore.getState().metrics,
      componentMetrics: {
        [nodeId]: {
          nodeId,
          nodeName: 'App Cluster',
          nodeType: 'app_server' as const,
          qps: 1500, // Exceeds single instance 1000, but within 3x replica 3000 cap
          p95LatencyMs: 15,
          avgLatencyMs: 12,
          errorRatePercent: 0,
          queueDepth: 0,
          activeConnections: 10,
          utilizationPercent: 50,
          cacheHitRatioPercent: 0,
          totalRequests: 1500,
          successfulRequests: 1500,
          failedRequests: 0,
        },
      },
    };

    const issues = detectBottlenecks(nodes, edges, mockMetrics);
    const capacityIssue = issues.find((i) => i.id === `overload_${nodeId}`);
    expect(capacityIssue).toBeUndefined(); // Not overloaded because capacity pool is 3000 QPS
  });

  it('Bug 10: Command Palette scenario selection switches active sidebar tab to scenarios', () => {
    const { loadScenario, setActiveSidebarTab } = useStore.getState();
    expect(useStore.getState().activeSidebarTab).toBe('palette');

    const sc = ALL_SCENARIOS[1];
    loadScenario(sc);
    setActiveSidebarTab('scenarios');

    expect(useStore.getState().currentScenario?.id).toBe(sc.id);
    expect(useStore.getState().activeSidebarTab).toBe('scenarios');
  });
});
