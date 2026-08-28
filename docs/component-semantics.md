# Compute Component Semantics

**Model version:** 3.0
**Last reviewed:** August 28, 2026

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

A load balancer selects exactly one eligible `request` edge. Targets marked `down` are excluded immediately; degraded and overloaded targets remain eligible until health-check timing and recovery semantics are implemented in task 96.

- Round robin rotates over the current eligible target list.
- Least connections chooses the smallest current in-flight count and round-robins ties.
- Consistent hashing maps the request key through a virtual-node ring.
- Weighted routing uses smooth weighted round robin. Until task 98 exposes weights in the editor, unspecified targets have equal weight.
- IP hash applies a stable hash to the originating client node identity, not the request ID or resource key.

Each routed dependency records a connection end time from its modeled edge and downstream duration. Expired connections are pruned at the next arrival, allowing least-connections decisions and load-balancer telemetry to reflect overlapping work rather than lifetime request totals.
