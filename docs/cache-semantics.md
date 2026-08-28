# Cache Semantics

**Model version:** 1.0
**Last reviewed:** August 28, 2026

SysSim models caches as stateful cache-aside stores. These rules cover tasks 41–50 and describe current behavior; hit-ratio calibration, outages, stampedes, cross-panel metric reconciliation, and seeded workload tolerance tests remain tasks 51–60.

## Request keys and distributions

Every generated request has a stable `requestKey` independent of its unique request ID. The global traffic configuration supports:

- `uniform`: equal probability across `requestKeySpaceSize` resources;
- `zipfian`: a deterministic rank-based hot-key distribution where lower-numbered resources are more popular;
- `custom`: user-supplied `key:weight` pairs, normalized by positive weight.

The same graph, traffic configuration, and seed produce the same generated key sequence and stochastic outcomes. The toolbar exposes the distribution and custom weights.

## Cache-aside lifecycle

1. The cache checks the stable request key and charges its configured read latency.
2. An unexpired entry returns `hit`, terminates that cache-aside branch, and does not contact the origin.
3. A missing or expired entry returns `miss` and activates an explicit `fallback` edge.
4. A successful origin response is eligible for population. `hitRatioPercent` is currently interpreted as the percentage of successful responses eligible for caching; it is labeled **Cacheable Responses** in the UI because it is not a guaranteed measured hit ratio.
5. Origin failures do not populate the cache.

## Capacity, TTL, and eviction

Redis and local-cache entry capacity is `floor(sizeMb × 1024 / entrySizeKb)`, with a minimum of one entry. CDN caches use a 100 MB illustrative shared edge store and browser caches use a 1 MB illustrative per-client store until explicit size controls are introduced for those types.

Every entry records insertion time, last access, frequency, and expiry. Expired entries miss at `expiresAt <= now`. When a full cache admits a new key:

| Policy | Entry removed |
| --- | --- |
| `LRU` | Least recently accessed |
| `LFU` | Lowest access count; insertion order breaks ties |
| `FIFO` | Earliest inserted |
| `TTL` | Entry expiring soonest |

Redis and local-cache reads use their configured `readLatencyMs` for hits and misses.

## Cache type boundaries

- **Redis cache:** shared server-side keyspace, configurable capacity, entry size, TTL, policy, and read latency.
- **Local cache:** modeled as a shared node-level process cache; the current graph node represents its configured cache scope.
- **CDN cache:** shared edge keyspace across clients; a hit avoids the origin, while a miss follows the origin fallback.
- **Browser cache:** keyspace is prefixed by source client ID, so one client's warm entry does not warm another client's browser.

CDN and browser cache behavior is intentionally separate from server caches even though all four use the same stateful storage primitive.
