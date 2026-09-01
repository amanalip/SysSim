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

`base propagation + payload transfer + protocol overhead + connection setup + expected repeated-attempt service time + cross-zone latency`

Transfer time uses decimal kilobytes and configured decimal megabits per second. Cross-zone transfer cost converts the same payload to decimal gigabytes. Keep-alive suppresses configured connection-setup time. The field labeled loss is an independent per-attempt failure probability; it produces expected attempts up to the edge retry limit but does not emulate packets, TCP retransmission, retry backoff, timeout selection, or correlated loss. Different non-empty source and target zone IDs add a fixed 2 ms educational cross-zone term and optional per-GB cost.

The overhead and cross-zone latency values below are illustrative constants chosen to expose model dimensions. They are not measurements, vendor defaults, or a valid protocol-performance ranking. Users comparing a real system should supply measured base latency and bandwidth and treat the protocol constant as an explicitly disclosed teaching aid.

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

The resilience helpers provide bounded exponential backoff with symmetric jitter, named bulkhead capacity pools, quorum availability, zone-member failure, and retry-amplification/queue buildup calculations. Jitter never exceeds the configured maximum delay. API gateways continue to model closed, open, and half-open circuit states. Supported NoSQL models expose read and write quorum availability metrics; the helper does not prove quorum intersection, linearizability, or consistency. SQL models expose replicas and failover.

A useful comparative experiment runs the same initial demand and failure rate with a high retry limit, then with bounded retries. The model reports attempt amplification, queued requests, and drops. A second experiment allocates unrelated dependencies to separate bulkhead pools to demonstrate that exhaustion remains isolated.

Timeout, retry, and failure inputs are educational assumptions. Protocol names never silently confer delivery, ordering, idempotency, or exactly-once guarantees.
