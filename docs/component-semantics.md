# Compute and Networking Component Semantics

**Model version:** 5.0
**Last reviewed:** August 29, 2026

## Client traffic

Global traffic QPS is the total offered load for the graph. It is not added to every client. When multiple client nodes exist, each client's `requestRateQps` is a non-negative weight that divides the global total through deterministic smooth weighted round-robin selection. For example, weights of 100 and 300 receive 25% and 75% of generated requests. If every weight is zero, clients share traffic equally.

Each generated request carries the selected client's inputs:

- `connectionType`: HTTP/2 adds 2 ms of modeled client/protocol overhead, HTTP/3 adds 1 ms, and an established WebSocket adds 0.5 ms;
- `requestPayloadKb`: adds 0.01 ms per KB to the client hop and remains attached to asynchronous delivery context;
- `operationType`: emits reads, writes, or a seeded mixed workload controlled by `readPercentage`;
- `requestKeyDistribution` and `requestKeySpaceSize`: generate uniform, Zipfian/hot-key, or global custom-weight request keys for that client.

These overhead constants are illustrative protocol setup/serialization assumptions, not network benchmarks. Edge latency remains a separate cost.

## Application server capacity

Application servers use deterministic fixed-service-time connection slots. `maxConnections` is a per-replica concurrent-connection limit, so total slots equal replicas multiplied by maximum connections. An arriving request takes the earliest slot on a replica whose throughput admission interval also permits work:

1. queue latency is the time until that slot becomes available;
2. processing latency is always the configured `processingLatencyMs`;
3. response latency is queue latency plus processing latency;
4. `maxThroughputQps` is enforced per replica as a minimum interval between admissions (`1000 / maxThroughputQps`), independent of its connection count.

Adding replicas increases both connection and throughput capacity and can reduce waiting, but never divides intrinsic processing time. The model reports active connection slots, scheduled queued requests, and rolling one-second CPU utilization as the greater of throughput load and connection occupancy, capped at 100%.

A degraded application-server node keeps `ceil(replicas / 2)` effective replicas and doubles intrinsic processing latency. A down node rejects work through the common health check. This explicit degraded rule is a teaching assumption, not a provider autoscaling or failover guarantee.

## Worker execution

Workers expose per-replica concurrency and processing-rate limits. Aggregate broker drain capacity multiplies both values by replicas. A worker hop takes the greater of configured processing latency and the reciprocal rate latency (`1000 / jobs per second`), so raising replicas increases capacity without making one job intrinsically faster. The lower of broker and worker retry limits applies to a failed delivery.

Telemetry reports peak busy slots in the latest simulation step, broker work queued for connected workers, effective processing latency, completed and failed attempts, and scheduled retries. Busy and queued figures are synthetic step-level values, not operating-system thread measurements.

## Serverless execution

Serverless functions maintain up to `concurrencyLimit` virtual instance slots. `warmInstances` provisions slots that remain warm; other slots have a cold-start probability that grows linearly from zero to 100% across `idleTimeoutSec`. A seeded random draw makes the outcome reproducible. Brand-new unprovisioned slots always cold-start.

When all slots are busy, a new invocation is throttled immediately with `rate_limited`; it is not silently queued. Execution time is the 512 MB baseline multiplied by `sqrt(512 / memoryMb)` (with memory floored at 128 MB). Cold-start time plus execution time is capped by `timeoutMs`; an over-limit invocation fails with `timeout`.

Telemetry separates throttles from invocation failures. Invocation failures include modeled platform faults, down functions, and execution timeouts. A dependency failure after the function starts increments the downstream-failure counter instead, even when the overall request later recovers through a fallback. Warm starts, cold starts, timeouts, current cold probability, and active invocations remain independently visible.

## Load-balancer routing

A load balancer selects exactly one eligible `request` edge. On first observation, a down target is excluded immediately. Later health changes are observed only at the configured health-check interval. A recovered target remains excluded until it has been continuously observed healthy for the configured recovery delay. Degraded and overloaded targets remain eligible.

- Round robin rotates over the current eligible target list.
- Least connections chooses the smallest current in-flight count and round-robins ties.
- Consistent hashing maps the request key through a virtual-node ring.
- Weighted routing uses smooth weighted round robin with a positive per-target weight configured in the load-balancer properties. Unspecified targets have weight 1.
- IP hash applies a stable hash to the originating client node identity, not the request ID or resource key.

Each routed dependency records a connection end time from its modeled edge and downstream duration. Expired connections are pruned at the next arrival, allowing least-connections decisions and load-balancer telemetry to reflect overlapping work rather than lifetime request totals.

When sticky sessions are enabled, the originating client node identity is associated with its selected healthy target. The association is removed when the target leaves the eligible set, allowing the client to be reassigned. Telemetry reports unavailable-target selection failures, currently unhealthy targets, and distribution skew as `(maximum target routes - minimum target routes) / average target routes × 100`. Skew is descriptive: sticky or weighted routing can make a non-zero value intentional.

## API gateway policy

The API gateway uses a token bucket with a one-second burst capacity equal to `rateLimitQps`; requests beyond available tokens fail immediately as `rate_limited`. Authentication adds illustrative local policy overhead before routing: None 0.2 ms, API key 0.5 ms, JWT 2 ms, and OAuth2 4 ms. These values do not model network calls to an identity provider.

`timeoutMs` is an upstream-attempt deadline. When edge plus downstream latency exceeds it, the request returns `timeout`. The compact circuit breaker counts downstream failures and gateway timeouts. It opens after three consecutive failures, fast-fails for 10 simulated seconds, then admits one half-open probe. A successful probe closes and resets the circuit; a failed probe reopens it. Disabling the breaker leaves the state closed without disabling rate limiting or timeouts.

Gateway telemetry keeps throttles, timeouts, and open-circuit rejections separate and exposes the current closed/open/half-open state.

## CDN edge caching

The CDN is a cache-aside edge tier. Request keys are namespaced to a deterministic edge location selected from the originating client identity and `edgeLocationsCount`. `cacheTtlSec` controls expiry; `hitRatioPercent` remains the seeded cache-hit target applied to otherwise warm entries. Each configured edge contributes a simplified 100 MB logical cache budget with 1 KB illustrative entries; read latency follows the geographic teaching curve below.

On a miss, the CDN forwards to an origin fallback; for compatibility, a request edge is treated as the origin route when no explicit fallback edge exists. A successful origin response populates the selected edge after the origin completes. With origin shielding enabled, simultaneous misses for the same resource across different edge locations coalesce behind one shared in-flight shield fetch. Without shielding, each edge can fetch independently.

Edge geography is an explicit teaching curve rather than a world map: nearest-edge latency is `max(5, 80 / sqrt(edgeLocationsCount))` milliseconds. Origin shielding adds 10 ms to a miss before origin routing. A hit ends at the edge; a miss includes edge, optional shield, origin-edge, and origin-service latency. Telemetry reports edge hits as origin-offloaded requests, successful origin fetches, their average edge-plus-origin latency, and origin egress payload in KB as separate values.

## DNS resolution

DNS performs resolution rather than generic multi-target application fanout. It selects exactly one healthy request target and application traversal continues to that address. Results are cached by originating client and request key for `ttlSec`; a cache hit costs 0.2 ms, while a miss costs `lookupLatencyMs`.

- Simple routing selects the first eligible stored address.
- Weighted routing uses smooth weighted round robin and editable positive target weights.
- Geolocation uses a stable hash of the originating client as a deterministic region proxy.
- Latency-based routing selects the eligible address whose configured edge latency is smallest.

The model reports resolution cache hits, misses, and failures. It does not model recursive resolvers, authoritative delegation, negative caching, DNSSEC, or real geographic coordinates.

## Firewall and WAF

A healthy WAF adds configured `inspectionLatencyMs` plus 0.005 ms per rule, capped at 5 ms of rule-scan cost. `blockRatePercent` is a seeded malicious-request classification control. A classified request ends with the distinct `blocked` request status and a rejected hop; it is not counted as an infrastructure fault. Down-node and generic simulated component faults increment the separate WAF infrastructure-failure counter.

The rule cost is illustrative linear scan work, not a vendor benchmark. Rules do not have individual match complexity, ordering, actions, or false-positive semantics.

## Reverse proxy

The proxy keeps connection reservations through downstream completion and rejects arrivals above `maxConnections`. Compression adds 0.02 ms per input KB and reduces the forwarded payload to 60% of its input size. Telemetry accumulates KB saved.

When buffering is enabled, `bufferSizeKb` absorbs that much compressed payload; excess bytes incur backpressure at `upstreamBandwidthMbps`. Without buffering, the complete forwarded payload is subject to that bandwidth delay. The formula is `overflow KB / (Mbps × 125 KB/s)`. Configured `cacheRules` are retained and labeled as diagram-only because SysSim has no safe, documented rule grammar to execute.

## SQL read routing

Client `operationType` and, for mixed workloads, seeded `readPercentage` determine whether a SQL request is a read or write. Reads round-robin across the configured virtual `readReplicasCount` when at least one exists. Writes always use the primary in the current single-primary model. Metrics separately report reads, writes, primary queries, and read-replica queries. Read replicas reduce the illustrative read-contention factor; they are virtual capacity inside the database node and do not create independent graph targets.
