# Client and Application Server Semantics

**Model version:** 1.0
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

Application servers use deterministic fixed-service-time replica slots. Every replica contributes one concurrent service slot in this version. An arriving request takes the earliest available slot:

1. queue latency is the time until that slot becomes available;
2. processing latency is always the configured `processingLatencyMs`;
3. response latency is queue latency plus processing latency;
4. `maxThroughputQps` places a per-replica lower bound on slot occupancy (`1000 / maxThroughputQps`).

Adding replicas therefore increases capacity and reduces waiting, but never divides or otherwise lowers intrinsic processing time. This replaces the former square-root latency heuristic. Maximum-connection enforcement, richer concurrent connections per replica, utilization, and degraded-state behavior remain tasks 81–85.
