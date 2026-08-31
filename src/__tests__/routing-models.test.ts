import { describe, it, expect } from 'vitest';
import { ConsistentHashRing } from '../engine/routing/consistent-hashing';
import { LoadBalancerRouter } from '../engine/routing/load-balancer';
import { CacheModel } from '../engine/components/cache-model';
import { RateLimiterModel } from '../engine/components/rate-limiter-model';
import { QueueModel } from '../engine/components/queue-model';
import { DatabaseModel } from '../engine/components/db-model';

describe('Routing Algorithms & Component Models Tests (Milestone 7)', () => {
  it('consistent hashing distributes keys stably and handles node removal', () => {
    const ring = new ConsistentHashRing(['nodeA', 'nodeB', 'nodeC']);
    const target1 = ring.getNode('user:101');
    const target2 = ring.getNode('user:101');
    expect(target1).toBe(target2); // Deterministic mapping

    ring.removeNode('nodeA');
    const targetAfterRemoval = ring.getNode('user:101');
    expect(targetAfterRemoval).toBeDefined();
    expect(targetAfterRemoval).not.toBe('nodeA');
  });

  it('load balancer router supports round robin and least connections', () => {
    const router = new LoadBalancerRouter('round_robin', ['srv1', 'srv2', 'srv3']);
    expect(router.selectTarget('req1')).toBe('srv1');
    expect(router.selectTarget('req2')).toBe('srv2');
    expect(router.selectTarget('req3')).toBe('srv3');
    expect(router.selectTarget('req4')).toBe('srv1');

    const lcRouter = new LoadBalancerRouter('least_connections', ['srv1', 'srv2']);
    const chosen = lcRouter.selectTarget('req5', { srv1: 10, srv2: 2 });
    expect(chosen).toBe('srv2');
  });

  it('routes fairly across least-connection ties and honors deterministic algorithm keys', () => {
    const least = new LoadBalancerRouter('least_connections', ['a', 'b']);
    expect([0, 1, 2, 3].map(() => least.selectTarget('key', { a: 2, b: 2 }))).toEqual([
      'a',
      'b',
      'a',
      'b',
    ]);

    const weighted = new LoadBalancerRouter('weighted', ['a', 'b'], { a: 3, b: 1 });
    const selections = Array.from({ length: 8 }, () => weighted.selectTarget('key'));
    expect(selections.filter((target) => target === 'a')).toHaveLength(6);
    expect(selections.filter((target) => target === 'b')).toHaveLength(2);

    const consistent = new LoadBalancerRouter('consistent_hashing', ['a', 'b', 'c']);
    expect(consistent.selectTarget({ requestKey: 'account:7', clientKey: 'client-a' })).toBe(
      consistent.selectTarget({ requestKey: 'account:7', clientKey: 'client-b' }),
    );

    const ipHash = new LoadBalancerRouter('ip_hash', ['a', 'b', 'c']);
    expect(ipHash.selectTarget({ requestKey: 'one', clientKey: 'client-a' })).toBe(
      ipHash.selectTarget({ requestKey: 'two', clientKey: 'client-a' }),
    );
  });

  it('cache model tracks hits, misses, and evicts entries', () => {
    const cache = new CacheModel(2, 'LRU', 0); // 0% random hit, rely on memory
    const miss = cache.access('item1');
    expect(miss.hit).toBe(false);
    cache.put('item1');

    const hit = cache.access('item1');
    expect(hit.hit).toBe(true);

    // Fill beyond size 2
    cache.put('item2');
    cache.put('item3'); // Should evict oldest

    expect(cache.getHitRatioPercent()).toBeGreaterThan(0);
  });

  it('rate limiter throttles requests exceeding limit', () => {
    const rl = new RateLimiterModel('token_bucket', 2, 1);
    expect(rl.allowRequest()).toBe(true);
    expect(rl.allowRequest()).toBe(true);
    expect(rl.allowRequest()).toBe(false); // Saturated
  });

  it('queue model enqueues and drains', () => {
    const q = new QueueModel(5, 10, 2);
    expect(q.enqueue().accepted).toBe(true);
    expect(q.enqueue().accepted).toBe(true);
    expect(q.getDepth()).toBe(2);

    q.drain(1000); // drain for 1 second at 10 items/sec
    expect(q.getDepth()).toBe(0);
  });

  it('database model executes queries with replica scaling', () => {
    const db = new DatabaseModel(20, 5, 3);
    const res = db.executeQuery(false);
    expect(res.latencyMs).toBeGreaterThan(0);
    expect(res.poolExhausted).toBe(false);
  });
});
