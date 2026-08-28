# Messaging Semantics

**Model version:** 1.0
**Last reviewed:** August 28, 2026

SysSim models messaging components as asynchronous producer/consumer boundaries. This contract covers tasks 61–70. Queue retention, outcome-specific telemetry, overload/recovery acceptance tests, and full blueprint validation remain tasks 71–75.

## Producer and consumer timeline

1. A producer reaches a messaging component through an `async`, `request`, or `fanout` edge.
2. The component creates one or more pending delivery copies. If admitting all copies would exceed `maxDepth`, it rejects the enqueue.
3. A successful enqueue returns after `producerAckLatencyMs`. The producer trace contains the messaging hop and stops there; downstream consumer latency and failures are not added to producer latency.
4. On later simulation steps, the broker drains eligible delivery copies according to elapsed simulation time, broker partition throughput, and connected consumer capacity.
5. Each drained copy traverses its configured downstream edge independently. A failure may retry, dead-letter, or drop according to the delivery configuration.

Queue depth means pending **delivery copies**, not merely unique producer messages. This makes subscriber fanout and consumer-group amplification visible. Task 73 will add separate producer, consumer, retry, age, and drop counters.

## Component distinctions

| Component | Delivery copies created per accepted producer message | Default ordering | Intended use |
| --- | ---: | --- | --- |
| Message queue | One per consumer group | Partition Key | Partitioned log/stream. Every group receives the message; members represented by connected workers share that group's partition work. |
| Task queue | One | FIFO | Point-to-point work distribution to one logical consumer. |
| Pub/Sub | `subscribersPerTopic` | None | One logical copy per configured subscriber. Copies are assigned across connected fanout targets. |
| Event bus | `fanoutFactor` | None | One logical copy per configured route/fanout destination. |

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

| Guarantee | Modeled behavior |
| --- | --- |
| At most once | A failed attempt is not retried. It is moved to the configured DLQ when enabled, otherwise dropped. |
| At least once | A failed attempt retries up to `retryLimit`; successful copies can be processed independently and the consumer must tolerate repeated attempts. |
| Exactly once (simulated) | Uses the same retry policy plus delivery-ID deduplication, so a repeated copy with an already completed delivery ID does not invoke the consumer again. This is a teaching abstraction, not a transaction protocol. |

Retries use deterministic exponential backoff: `retryDelayMs × 2^(attempt - 1)`. With FIFO ordering, a delayed head retry blocks the entire queue. With partition-key ordering, it blocks only its partition. Once the configured retry limit is exhausted, the delivery moves to the in-memory dead-letter queue when enabled or is dropped otherwise.

## Deliberate boundaries

- Consumer groups, subscribers, and event routes are logical counts; membership changes, offset commits, leases, and rebalances are not modeled.
- Exactly-once mode represents deduplication by delivery ID and does not claim atomic database writes, distributed transactions, or broker-specific guarantees.
- Retry and dead-letter state is deterministic and in-memory for the current run.
- Retention expiry, message age, overflow/drop telemetry, and explicit producer-versus-consumer outcome panels remain tasks 71–75.
- Worker service-time and utilization will be refined further by the component-specific worker tasks 86–88.
