# Messaging Semantics

**Model version:** 2.0
**Last reviewed:** August 28, 2026

SysSim models messaging components as asynchronous producer/consumer boundaries. This contract covers tasks 61–75, including retention, overflow, outcome-specific telemetry, deterministic recovery tests, and the event-driven blueprint.

## Producer and consumer timeline

1. A producer reaches a messaging component through an `async`, `request`, or `fanout` edge.
2. The component creates one or more pending delivery copies. If admitting all copies would exceed `maxDepth`, it either rejects the newest producer message or evicts the oldest pending copies, according to `overflowPolicy`.
3. A successful enqueue returns after `producerAckLatencyMs`. The producer trace contains the messaging hop and stops there; downstream consumer latency and failures are not added to producer latency.
4. On later simulation steps, the broker drains eligible delivery copies according to elapsed simulation time, broker partition throughput, and connected consumer capacity.
5. Each drained copy traverses its configured downstream edge independently. A failure may retry, dead-letter, or drop according to the delivery configuration.

Queue depth means pending **delivery copies**, not merely unique producer messages. This makes subscriber fanout and consumer-group amplification visible. Producer acceptance/rejection, consumer success/failure, retries, oldest queue age, drops, expiry, and DLQ totals are reported separately. The top-level request success metric means synchronous completion or asynchronous producer acceptance; it never claims that a consumer completed.

## Retention and overflow

- Every pending delivery records its original enqueue time. A delivery expires when its age exceeds `retentionHours`, including while it is waiting for retry backoff.
- Expired deliveries leave the pending queue and increment both the expired and dropped counters. Retention expiry does not route to the DLQ because it is a broker lifecycle outcome, not a consumer-processing failure.
- `reject_newest` rejects the complete producer message if all of its logical copies do not fit. Producer-rejected and dropped-copy counters increase; no partial fanout is admitted.
- `drop_oldest` removes the oldest pending delivery copies until the new message fits. The producer is accepted and the evicted copies increase the dropped counter.
- A configured message whose fanout copy count is itself larger than `maxDepth` is rejected even under `drop_oldest`.

## Component distinctions

| Component     | Delivery copies created per accepted producer message | Default ordering | Intended use                                                                                                                          |
| ------------- | ----------------------------------------------------: | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Message queue |                                One per consumer group | Partition Key    | Partitioned log/stream. Every group receives the message; members represented by connected workers share that group's partition work. |
| Task queue    |                                                   One | FIFO             | Point-to-point work distribution to one logical consumer.                                                                             |
| Pub/Sub       |                                 `subscribersPerTopic` | None             | One logical copy per configured subscriber. Copies are assigned across connected fanout targets.                                      |
| Event bus     |                                        `fanoutFactor` | None             | One logical copy per configured route/fanout destination.                                                                             |

When logical copies outnumber drawn downstream edges, copies are assigned round-robin across those edges. This represents multiple logical consumer instances without requiring a separate canvas node for every instance.

## Drain capacity

Consumer work is bounded by the minimum of three rates over the elapsed step:

- configured worker processing rate multiplied by worker replicas;
- worker concurrency divided by configured consumer processing latency;
- per-partition broker throughput multiplied by populated partitions that can run concurrently.

For multiple connected consumers, their rates and concurrency slots are summed. A down consumer contributes no capacity, so backlog remains queued for recovery instead of being treated as an immediate producer failure. Fractional capacity carries between steps, keeping low rates deterministic at small tick sizes.

## Partitions and consumer groups

- `FIFO` assigns every delivery to partition zero and globally blocks later work behind an earlier delayed retry.
- `Partition Key` hashes the stable request key to a partition. Order is preserved within that partition, while another populated partition may progress independently.
- `None` assigns partitions round-robin and allows any ready delivery to progress.
- Increasing partition count raises parallel drain capacity only when multiple partitions contain work and connected consumers have enough capacity.
- A message queue creates one logical delivery per consumer group. It does not broadcast once per member inside a group; members share the group's partition workload.

## Delivery guarantees

| Guarantee                | Modeled behavior                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At most once             | A failed attempt is not retried. It is moved to the configured DLQ when enabled, otherwise dropped.                                                                                                                 |
| At least once            | A failed attempt retries up to `retryLimit`; successful copies can be processed independently and the consumer must tolerate repeated attempts.                                                                     |
| Exactly once (simulated) | Uses the same retry policy plus delivery-ID deduplication, so a repeated copy with an already completed delivery ID does not invoke the consumer again. This is a teaching abstraction, not a transaction protocol. |

Retries use deterministic exponential backoff: `retryDelayMs × 2^(attempt - 1)`. With FIFO ordering, a delayed head retry blocks the entire queue. With partition-key ordering, it blocks only its partition. Once the configured retry limit is exhausted, the delivery moves to the in-memory dead-letter queue when enabled or is dropped otherwise.

## Deliberate boundaries

- Consumer groups, subscribers, and event routes are logical counts; membership changes, offset commits, leases, and rebalances are not modeled.
- Exactly-once mode represents deduplication by delivery ID and does not claim atomic database writes, distributed transactions, or broker-specific guarantees.
- Retry and dead-letter state is deterministic and in-memory for the current run.
- Retention is an in-memory simulation-time limit; disk segments, compaction, storage quotas, and replay offsets are not modeled.
- Worker service time, per-replica concurrency/rate, retry ceilings, busy slots, queued work, and failure/retry telemetry follow the compute rules in [Client and Application Server Semantics](component-semantics.md). Broker retry policy still supplies the outer retry ceiling.

## Blueprint validation

The `Messaging Pipeline Topology` blueprint is covered by a deterministic integration test. The gateway finishes at queue acknowledgement; the queue's two default consumer-group copies later drain across the two workers and both reach the sink. The test also verifies that producer acceptance and consumer success remain separate telemetry values.
