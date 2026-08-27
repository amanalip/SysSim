# Edge Semantics

**Model version:** 1.0
**Last reviewed:** August 27, 2026

This document defines how the simulation engine interprets directed edges. It is normative for the current engine; canvas visuals and saved-data migration remain follow-up work in checklist tasks 31–34.

## Purpose selection policy

Every new edge receives a `data.purpose` value. The stored value is authoritative.

Until the purpose selector is added in task 32, the editor chooses an initial value from the endpoint types and protocol:

1. database-to-database edges start as `replication`;
2. edges leaving pub/sub or event-bus nodes start as `fanout`;
3. edges entering or leaving messaging components, and `pub/sub` or MQTT protocol edges, start as `async`;
4. every other new edge starts as `request`.

Inference occurs only when the edge is created. It does not silently change an explicitly stored purpose after a component or protocol edit.

Older graphs without `data.purpose` execute as `request` edges. This conservative runtime fallback avoids silently reinterpreting existing diagrams. Persisted migration and migration tests remain task 34.

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

## Known limits

- Invalid purpose/component combinations are not blocked until task 31.
- Purpose is not yet displayed or editable on the canvas until task 32.
- Full round-trip persistence coverage and legacy migration are tasks 33–34.
- Branch traces use a flat hop list; structured parent/child spans are future trace work.
- Detached work executes immediately inside the current simulation step rather than through a scheduled job/event queue.
- Cycles are currently stopped by visited-node detection; explicit hop-limit failure semantics remain task 40.
- Messaging component distinctions, retries, consumer groups, and backlog timing remain tasks 61–78.
