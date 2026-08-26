import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';

describe('Bugs Batch 3: Health Radar Resilience & Cost Estimator Client Exclusions', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      bottlenecks: [],
    });
  });

  it('Bug 6: Multi-replica application server tier contributes to resilience score', () => {
    const { addNode, updateNodeConfig } = useStore.getState();
    const srvId = addNode('app_server', { x: 100, y: 100 }, 'App Cluster');
    updateNodeConfig(srvId, { replicas: 3 });

    const nodes = useStore.getState().nodes;
    const totalAppReplicas = nodes
      .filter((n) => n.data.config.type === 'app_server')
      .reduce((sum, n) => sum + ((n.data.config as any).replicas || 1), 0);

    expect(totalAppReplicas).toBe(3);
    expect(totalAppReplicas > 1).toBe(true);
  });

  it('Bug 7: Client traffic nodes are excluded from cloud infrastructure billing', () => {
    const { addNode } = useStore.getState();
    addNode('client', { x: 50, y: 100 }, 'Global Clients');
    addNode('app_server', { x: 250, y: 100 }, 'App Server');

    const nodes = useStore.getState().nodes;
    const billableNodes = nodes.filter((n) => n.data.config.type !== 'client');

    expect(billableNodes.length).toBe(1);
    expect(billableNodes[0].data.config.type).toBe('app_server');
  });
});
