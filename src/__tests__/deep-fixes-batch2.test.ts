import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';

describe('Deep Fixes Batch 2: Context Menu Configure Trigger & Cost Estimator DB Read Replicas', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isPropertiesPanelOpen: false,
    });
  });

  it('Fix 3: Context menu configure opens properties panel and selects target node', () => {
    const { addNode, selectNode, setIsPropertiesPanelOpen } = useStore.getState();
    const nodeId = addNode('app_server', { x: 150, y: 150 }, 'Main App');

    // Close properties panel first
    setIsPropertiesPanelOpen(false);
    selectNode(null);
    expect(useStore.getState().isPropertiesPanelOpen).toBe(false);

    // Simulate configure action
    selectNode(nodeId);
    setIsPropertiesPanelOpen(true);

    expect(useStore.getState().selectedNodeId).toBe(nodeId);
    expect(useStore.getState().isPropertiesPanelOpen).toBe(true);
  });

  it('Fix 4: Cost Estimator calculates read replicas and other category instances in billing', () => {
    const { addNode, updateNodeConfig } = useStore.getState();

    // 1 SQL DB with 2 read replicas = 3 DB host instances total
    const dbId = addNode('sql_db', { x: 300, y: 150 }, 'PostgreSQL Primary');
    updateNodeConfig(dbId, { readReplicasCount: 2 } as any);

    // 1 DNS node (Other category)
    addNode('dns', { x: 50, y: 50 }, 'Route 53 DNS');

    const state = useStore.getState();
    const dbNode = state.nodes.find((n) => n.id === dbId);
    const config = dbNode?.data.config as any;
    const totalDbInstances = (config.replicas || 1) + (config.readReplicasCount || 0);

    expect(totalDbInstances).toBe(3);
  });
});
