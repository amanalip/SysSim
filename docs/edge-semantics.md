# Edge Semantics

**Model version:** 1.1
**Last reviewed:** August 28, 2026

This document defines how the simulation engine interprets directed edges. It is normative for the engine, editor, and version-2 saved canvas format.

## Purpose selection policy

Every new edge receives a `data.purpose` value. The stored value is authoritative.

The editor chooses an initial value from the endpoint types and protocol:

1. edges leaving a cache start as `fallback`;
2. database-to-database edges start as `replication`;
3. edges leaving pub/sub or event-bus nodes start as `fanout`;
4. edges entering or leaving messaging components, and `pub/sub` or MQTT protocol edges, start as `async`;
5. every other new edge starts as `request`.

Inference occurs only when the edge is created. It does not silently change an explicitly stored purpose after a component or protocol edit.

The canvas shows protocol and purpose as independently accessible buttons. Invalid purpose/component combinations are disabled and rejected by store actions. Version-1 graphs without `data.purpose` are migrated once using the inference policy above. JSON export, URL sharing, snapshots, history, undo, and redo retain the explicit value.

## Purpose definitions

| Purpose | Execution | End-user latency | End-user status |
| --- | --- | --- | --- |
| `request` | A synchronous dependency. Generic nodes execute all request dependencies in edge order. Load balancers select exactly one request target with their routing algorithm. | Adds edge latency and every awaited downstream branch latency. | Fails when any awaited dependency fails, unless a fallback succeeds. |
| `fanout` | Starts every fanout branch independently from the same logical point and waits for all branches. | Adds the slowest parallel branch, not the sum of branches. | Fails when any branch fails, unless a fallback succeeds. |
| `fallback` | Runs only after a cache miss or failed request/fanout/async acknowledgement. Fallbacks are tried in edge order until one succeeds. | Adds the failed attempt and the attempted fallback latency. | A successful fallback recovers the request; otherwise the last failure remains terminal. |
| `async` | Dispatches downstream work independently. The producer waits through the edge and the first target hop, treated as acknowledgement/enqueue processing. Remaining downstream work updates component metrics independently. | Stops after the first target acknowledgement hop. | A failed acknowledgement fails the producer; failures after a successful acknowledgement do not change the producer outcome. |
| `replication` | Processes the target branch independently for component metrics. | Does not contribute. | Does not change the end-user request outcome. |
| `observability` | Processes the target branch independently, using the same detached execution mechanism as replication in model 1.0. | Does not contribute. | Does not change the end-user request outcome. |

Cut edges do not participate in any purpose.

## Branch aggregation

### Synchronous request dependencies

For a generic component with multiple `request` edges, dependencies run in stored edge order. The caller waits for each response, so their edge and service latencies accumulate. This is deliberately not load balancing.

A load balancer is the only current component that selects one of multiple `request` edges. Its configured algorithm owns that selection.

### Fanout

Every fanout branch receives an independent visited-node set derived from the caller's path. Branches share the same logical start time. The caller's fanout latency is the maximum complete branch latency. Trace hops are flattened into the parent trace and carry `viaEdgePurpose: "fanout"` so later trace UI can group them.

### Fallback

Fallback is conditional. A healthy primary result does not touch fallback targets. A primary failure or cache miss activates fallback edges. When a fallback succeeds, the parent request succeeds but retains the attempted-primary hops and latency for diagnosis.

### Asynchronous acknowledgement

The parent trace includes the first async target hop because it represents enqueue or acknowledgement processing. Work after that hop is detached: it can update target/component metrics but cannot increase the already acknowledged parent latency or retroactively fail it.

### Replication

Replication traffic is detached from the user request. Replica processing and failures affect replica component metrics, but replication nodes are omitted from the end-user request path and latency. Replication lag, quorum, durability, and failover are not modeled yet.

### Cycles and hop TTL

Each branch carries its visited-node set and a 64-hop TTL. Revisiting a node or exhausting that TTL produces an `error` hop with an explicit trace reason. A cycle is never silently accepted as a successful terminal route. A disconnected root with no outgoing execution edges is a valid terminal path.

## Known limits

- Branch traces use a flat hop list; structured parent/child spans are future trace work.
- Detached work executes immediately inside the current simulation step rather than through a scheduled job/event queue.
- Messaging component distinctions, acknowledgement/consumer timing, backlog drain, partitions, consumer groups, fanout, delivery guarantees, retries, DLQ, and ordering are defined in [Messaging Semantics](messaging-semantics.md). Retention and messaging telemetry follow-ups remain tasks 71–75.
