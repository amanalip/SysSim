# Cache Semantics

**Model version:** 1.1
**Last reviewed:** August 28, 2026

SysSim models caches as stateful cache-aside stores. These rules cover the completed cache-correctness work in tasks 41–60, including calibrated hit targets, outage bypass, stampedes, request coalescing, and cache telemetry.

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
4. A successful origin response schedules population after the modeled origin latency. Until that fill completes, another same-key request is a concurrent miss.
5. Origin failures do not populate the cache.
6. For a warm, unexpired entry, `hitRatioPercent` is a seeded **Cache Hit Target**: each lookup is classified against that target. It is an illustrative workload control, not a prediction from object popularity or production telemetry.

## Failure, stampede, and coalescing behavior

When a cache is down, the cache hop records an error and the request follows its explicit origin `fallback` edge. A successful origin response recovers the request. The cache bypass count increases, origin load increases, and the end-to-end request is not reported as failed merely because the optional cache was unavailable. Without an available fallback, the failure remains terminal.

Concurrent cold requests are represented by delaying cache population until origin work completes. With **Request coalescing OFF**, every same-key request arriving before the fill completes reaches the origin, exposing a cache stampede. With **Request coalescing ON**, the first miss reaches the origin and later same-key requests wait behind that in-flight fill; those followers increment the coalesced-request count and do not duplicate origin work. Redis and local caches default this control off; CDN and browser caches default it on.

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

## Telemetry and visual contract

- Cache components record cumulative hits, misses, outage bypasses, and coalesced followers. Overall telemetry is the sum of those component counters.
- Hit ratio is `hits / (hits + misses)`; bypasses and coalesced followers are reported separately rather than changing the lookup denominator.
- Time-series points and CSV exports include all four counters alongside the measured cache-hit ratio.
- Trace hops label `HIT`, `MISS → ORIGIN`, `BYPASS`, or `COALESCED` and retain explanatory hop text. A hit terminates at the cache; a miss trace includes the origin fallback.
- Requests ending in a cache hit use cyan (`#06b6d4`) for their canvas particle.

## Calibration and tests

The cache suite uses deterministic seeds. Its representative 90% warm-cache workload accepts a measured hit ratio from 87% through 93%, and therefore an origin fraction from 7% through 13%. The suite also proves replay stability, reduced origin traffic at higher targets, increased origin traffic during outage without arbitrary request failure, trace labels, counter/export agreement, and reachable cyan particles.
