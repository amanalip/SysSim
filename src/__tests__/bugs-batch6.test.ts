import { describe, it, expect } from 'vitest';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { ConsistentHashRing } from '../engine/routing/consistent-hashing';
import { DatabaseModel } from '../engine/components/db-model';
import { createDefaultConfig } from '../model/component-defaults';

describe('Bugs Batch 6: Low QPS Fractional Generation, DB Tick Connection Release, Consistent Hash Ring Sentinel', () => {
  it('Bug 13: Low QPS configuration does not overgenerate requests per tick', () => {
    const engine = new SysSimEngine();
    const clientNode = { id: 'client_1', config: createDefaultConfig('client', 'client_1', 'Client') };
    const appNode = { id: 'app_1', config: createDefaultConfig('app_server', 'app_1', 'App Server') };
    const graph: SimGraph = {
      nodes: [clientNode, appNode],
      edges: [{ id: 'e1', source: 'client_1', target: 'app_1', data: { protocol: 'HTTP', isCut: false } }],
    };

    engine.setGraph(graph);
    // Configure very low 10 QPS (0.5 requests per 50ms tick)
    engine.setConfig({ baseQps: 10, pattern: 'steady' });
    engine.start();

    // Step 20 ticks of 50ms = 1.0 second total simulation time
    for (let i = 0; i < 20; i++) {
      engine.step(50);
    }

    const metrics = engine.getMetricsSnapshot();
    // At 10 QPS over 1 second, exactly 10 requests should be generated, not 20!
    expect(metrics.totalRequestsSent).toBe(10);
  });

  it('Bug 14: DatabaseModel connection pool drains during simulation ticks without setTimeout', () => {
    const db = new DatabaseModel(20, 10, 0); // max 10 connections
    for (let i = 0; i < 5; i++) {
      db.executeQuery(true);
    }
    expect(db.getActiveConnections()).toBe(5);

    // Advance 50ms in simulation time
    db.drainConnections(50);
    expect(db.getActiveConnections()).toBeLessThan(5);
  });

  it('Bug 15: ConsistentHashRing wraps back to index 0 when key hash exceeds all ring nodes', () => {
    const ring = new ConsistentHashRing(['node_alpha', 'node_beta'], 10);
    const selected = ring.getNode('some_high_hash_key_12345');
    expect(selected).toBeDefined();
    expect(['node_alpha', 'node_beta']).toContain(selected);
  });
});
