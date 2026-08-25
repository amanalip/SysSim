import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { AppServerConfig, LoadBalancerConfig, RedisCacheConfig } from '../model/types';

describe('Properties Panel & Config Tests (Milestone 4)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
  });

  it('updates component configuration in store', () => {
    const id = useStore.getState().addNode('app_server', { x: 100, y: 100 });
    useStore.getState().selectNode(id);
    expect(useStore.getState().isPropertiesPanelOpen).toBe(true);

    useStore.getState().updateNodeConfig(id, {
      name: 'User Service API',
      replicas: 5,
      processingLatencyMs: 45,
    });

    const node = useStore.getState().nodes.find((n) => n.id === id);
    const config = node?.data.config as AppServerConfig;

    expect(config.name).toBe('User Service API');
    expect(config.replicas).toBe(5);
    expect(config.processingLatencyMs).toBe(45);
  });

  it('configures load balancer algorithms and cache hit ratios', () => {
    const lbId = useStore.getState().addNode('load_balancer', { x: 50, y: 50 });
    const cacheId = useStore.getState().addNode('redis_cache', { x: 200, y: 50 });

    useStore.getState().updateNodeConfig(lbId, {
      algorithm: 'least_connections',
    });

    useStore.getState().updateNodeConfig(cacheId, {
      hitRatioPercent: 95,
      evictionPolicy: 'LFU',
    });

    const lb = useStore.getState().nodes.find((n) => n.id === lbId)?.data.config as LoadBalancerConfig;
    const cache = useStore.getState().nodes.find((n) => n.id === cacheId)?.data.config as RedisCacheConfig;

    expect(lb.algorithm).toBe('least_connections');
    expect(cache.hitRatioPercent).toBe(95);
    expect(cache.evictionPolicy).toBe('LFU');
  });

  it('updates health status override', () => {
    const id = useStore.getState().addNode('sql_db', { x: 100, y: 100 });
    useStore.getState().setNodeHealthOverride(id, 'down');

    const node = useStore.getState().nodes.find((n) => n.id === id);
    expect(node?.data.config.health).toBe('down');
  });
});
