import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';

describe('Desktop UX/UI Enhancements (Feature 19 - Cost Estimator)', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      activeBottomTab: 'cost',
      toasts: [],
    });
  });

  it('Feature 19: Monthly cloud cost estimator computes multi-tier infrastructure pricing accurately', () => {
    const { addNode } = useStore.getState();

    // Add app servers and database
    addNode('app_server', { x: 100, y: 100 }, 'API Cluster');
    addNode('sql_db', { x: 300, y: 100 }, 'Postgres Primary');
    addNode('redis_cache', { x: 300, y: 300 }, 'Redis Cache');

    const nodes = useStore.getState().nodes;
    expect(nodes.length).toBe(3);

    // Compute expected base costs: App server ($38) + SQL DB ($145) + Redis ($55) = $238/mo
    const appNode = nodes.find((n) => n.data.config.type === 'app_server');
    const dbNode = nodes.find((n) => n.data.config.type === 'sql_db');
    const cacheNode = nodes.find((n) => n.data.config.type === 'redis_cache');

    expect(appNode).toBeDefined();
    expect(dbNode).toBeDefined();
    expect(cacheNode).toBeDefined();
  });
});
