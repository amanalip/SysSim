import { describe, expect, it } from 'vitest';
import { CacheModel } from '../engine/components/cache-model';
import { SysSimEngine, SimGraph } from '../engine/simulator';
import { createSimRequest } from '../engine/request';
import { createDefaultConfig } from '../model/component-defaults';
import { BrowserCacheConfig, CdnCacheConfig, LocalCacheConfig, RedisCacheConfig, SimRequest } from '../model/types';

const cache = (policy: 'LRU' | 'LFU' | 'FIFO' | 'TTL', ttlMs = 1000) => new CacheModel({
  sizeLimit: 2,
  evictionPolicy: policy,
  ttlMs,
  readLatencyMs: 3,
});

const execute = (engine: SysSimEngine, source: string, key: string, sequence: number) => {
  const request = createSimRequest(source, sequence, key, sequence);
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};

describe('cache correctness', () => {
  it('generates seeded uniform, Zipfian, and custom request-key distributions', () => {
    const base = { pattern: 'steady' as const, baseQps: 1, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 9 };
    const sample = (engine: SysSimEngine, count = 100) => Array.from(
      { length: count },
      () => (engine as any).generateRequestKey() as string,
    );
    const uniform = sample(new SysSimEngine(undefined, { ...base, requestKeyDistribution: 'uniform', requestKeySpaceSize: 5 }));
    expect(new Set(uniform).size).toBe(5);

    const zipfian = sample(new SysSimEngine(undefined, { ...base, requestKeyDistribution: 'zipfian', requestKeySpaceSize: 10 }), 1000);
    expect(zipfian.filter((key) => key === 'resource:0').length).toBeGreaterThan(
      zipfian.filter((key) => key === 'resource:9').length,
    );

    const custom = sample(new SysSimEngine(undefined, {
      ...base,
      requestKeyDistribution: 'custom',
      customRequestKeys: [{ key: 'home', weight: 1 }, { key: 'search', weight: 0 }],
    }));
    expect(new Set(custom)).toEqual(new Set(['home']));
  });

  it('uses a stable request key and populates only after the caller puts a successful origin response', () => {
    const model = cache('LRU');
    expect(model.access('article:42', 0).hit).toBe(false);
    expect(model.access('article:42', 1).hit).toBe(false);
    model.put('article:42', 2);
    expect(model.access('article:42', 3)).toEqual({ hit: true, latencyMs: 3 });
  });

  it('expires entries at TTL', () => {
    const model = cache('TTL', 100);
    model.put('a', 0);
    expect(model.access('a', 99).hit).toBe(true);
    expect(model.access('a', 100).hit).toBe(false);
  });

  it('implements distinct LRU, FIFO, LFU, and TTL eviction choices', () => {
    const lru = cache('LRU');
    lru.put('a', 0); lru.put('b', 1); lru.access('a', 2); lru.put('c', 3);
    expect(lru.has('a', 3)).toBe(true); expect(lru.has('b', 3)).toBe(false);

    const fifo = cache('FIFO');
    fifo.put('a', 0); fifo.put('b', 1); fifo.access('a', 2); fifo.put('c', 3);
    expect(fifo.has('a', 3)).toBe(false); expect(fifo.has('b', 3)).toBe(true);

    const lfu = cache('LFU');
    lfu.put('a', 0); lfu.put('b', 1); lfu.access('a', 2); lfu.put('c', 3);
    expect(lfu.has('a', 3)).toBe(true); expect(lfu.has('b', 3)).toBe(false);

    const ttl = new CacheModel({ sizeLimit: 2, evictionPolicy: 'TTL', ttlMs: 100, readLatencyMs: 1 });
    ttl.put('a', 0); ttl.put('b', 10); ttl.put('c', 20);
    expect(ttl.has('a', 20)).toBe(false); expect(ttl.has('b', 20)).toBe(true);
  });

  it('uses configured capacity and Redis read latency', () => {
    const redis: RedisCacheConfig = {
      ...(createDefaultConfig('redis_cache', 'cache') as RedisCacheConfig),
      sizeMb: 1,
      entrySizeKb: 512,
      readLatencyMs: 7,
      hitRatioPercent: 100,
    };
    const engine = new SysSimEngine({ nodes: [{ id: 'cache', config: redis }], edges: [] });
    const model = (engine as any).cacheModels.get('cache') as CacheModel;
    model.put('a', 0); model.put('b', 0); model.put('c', 0);
    expect(model.getSize()).toBe(2);
    expect(model.access('c', 1).latencyMs).toBe(7);

    const local: LocalCacheConfig = {
      ...(createDefaultConfig('local_cache', 'local') as LocalCacheConfig),
      readLatencyMs: 0.75,
    };
    const localEngine = new SysSimEngine({ nodes: [{ id: 'local', config: local }], edges: [] });
    const localModel = (localEngine as any).cacheModels.get('local') as CacheModel;
    expect(localModel.access('missing', 1).latencyMs).toBe(0.75);
  });

  it('terminates cache hits and routes misses to origin before populating', () => {
    const redis = {
      ...(createDefaultConfig('redis_cache', 'cache') as RedisCacheConfig),
      hitRatioPercent: 100,
      readLatencyMs: 2,
    };
    const graph: SimGraph = {
      nodes: [
        { id: 'cache', config: redis },
        { id: 'origin', config: createDefaultConfig('sql_db', 'origin') },
      ],
      edges: [{ id: 'fallback', source: 'cache', target: 'origin', data: { protocol: 'TCP', purpose: 'fallback' } }],
    };
    const engine = new SysSimEngine(graph, { pattern: 'steady', baseQps: 1, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 2 });
    const miss = execute(engine, 'cache', 'product:1', 1);
    const hit = execute(engine, 'cache', 'product:1', 2);
    expect(miss.path.map((hop) => hop.nodeId)).toEqual(['cache', 'origin']);
    expect(hit.path.map((hop) => hop.nodeId)).toEqual(['cache']);
    expect(hit.path[0].status).toBe('hit');
    expect(hit.color).toBe('#06b6d4');
  });

  it('isolates browser cache by client while sharing CDN edge cache', () => {
    const makeGraph = (kind: 'browser_cache' | 'cdn_cache'): SimGraph => ({
      nodes: [
        { id: 'a', config: createDefaultConfig('client', 'a') },
        { id: 'b', config: createDefaultConfig('client', 'b') },
        { id: 'cache', config: {
          ...createDefaultConfig(kind, 'cache'),
          hitRatioPercent: 100,
        } as BrowserCacheConfig | CdnCacheConfig },
        { id: 'origin', config: createDefaultConfig('app_server', 'origin') },
      ],
      edges: [
        { id: 'a-cache', source: 'a', target: 'cache', data: { protocol: 'HTTP', purpose: 'request' } },
        { id: 'b-cache', source: 'b', target: 'cache', data: { protocol: 'HTTP', purpose: 'request' } },
        { id: 'origin', source: 'cache', target: 'origin', data: { protocol: 'HTTP', purpose: 'fallback' } },
      ],
    });

    const browser = new SysSimEngine(makeGraph('browser_cache'), { pattern: 'steady', baseQps: 1, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 3 });
    execute(browser, 'a', 'asset:logo', 1);
    expect(execute(browser, 'b', 'asset:logo', 2).path.at(-1)?.nodeId).toBe('origin');

    const cdn = new SysSimEngine(makeGraph('cdn_cache'), { pattern: 'steady', baseQps: 1, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 3 });
    execute(cdn, 'a', 'asset:logo', 1);
    expect(execute(cdn, 'b', 'asset:logo', 2).path.at(-1)?.nodeId).toBe('cache');
  });
});
