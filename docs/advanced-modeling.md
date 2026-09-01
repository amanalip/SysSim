# Advanced workload, network, and resilience modeling

## Workloads

Traffic can use steady, alternating burst, ramp, spike, diurnal, or custom trace schedules. Operation mixes assign weights to read, write, compute, and message operations. Existing client read/write settings remain the fallback when no workload mix or trace is configured.

Payloads support fixed, uniform, and bounded approximate-lognormal distributions with independent request and response ranges. Request-key distribution remains uniform, Zipfian/hot-key, or custom weighted, allowing cache and partition-skew experiments.

Custom traces accept JSON arrays or CSV with the header:

```text
timeSec,qps,operation,requestPayloadKb,responsePayloadKb
```

Imports are limited to the architecture byte limit and 1,000 points. QPS and payload values are clamped to simulator safety limits, points are sorted by modeled time, and unsupported operations are rejected.

## Network timing

Advanced edge timing is decomposed as:

`base propagation + payload transfer + protocol overhead + connection setup + expected bounded retry delay + cross-zone latency`

Transfer time uses combined request and response kilobytes and configured megabits per second. Keep-alive suppresses configured connection-setup time. Loss produces expected retry attempts up to the edge retry limit. Different non-empty source and target zone IDs add a documented 2 ms educational cross-zone term and optional per-GB cost.

Protocol constants model timing overhead only:

| Protocol  | Overhead | Explicit non-guarantee                                     |
| --------- | -------: | ---------------------------------------------------------- |
| HTTP      |   1.5 ms | No HTTP version, TLS, caching, or retry semantics inferred |
| gRPC      |   0.7 ms | No streaming, deadline, or delivery semantics inferred     |
| WebSocket |   0.4 ms | Assumes an established channel unless setup is configured  |
| TCP       |   0.3 ms | Does not emulate congestion control or retransmission      |
| UDP       |   0.1 ms | No delivery or ordering guarantee                          |
| MQTT      |   0.5 ms | Broker QoS and delivery semantics remain separate          |
| pub/sub   |   0.8 ms | Fanout/delivery behavior comes from messaging models       |

Legacy edges without advanced fields retain their existing simple latency behavior.

## Resilience experiments

The resilience helpers provide bounded exponential backoff with jitter, named bulkhead capacity pools, quorum availability, zone-member failure, and retry-amplification/queue buildup calculations. API gateways continue to model closed, open, and half-open circuit states. Supported NoSQL models expose read and write quorum metrics; SQL models expose replicas and failover.

A useful comparative experiment runs the same initial demand and failure rate with a high retry limit, then with bounded retries. The model reports attempt amplification, queued requests, and drops. A second experiment allocates unrelated dependencies to separate bulkhead pools to demonstrate that exhaustion remains isolated.

Timeout, retry, and failure inputs are educational assumptions. Protocol names never silently confer delivery, ordering, idempotency, or exactly-once guarantees.
