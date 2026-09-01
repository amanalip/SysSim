# Distributed-systems assumptions fact-check — September 1, 2026

**Reviewed revision:** working tree after `f6f2f55`  
**Review type:** source-backed desk review, not independent practitioner sign-off  
**Scope:** queue references, percentiles, workload generation, network timing, retries, protocol labels, bulkheads, quorum availability, zones, and resilience demonstrations

## Decision

The implemented models are suitable as disclosed educational abstractions after the corrections recorded below. They are not suitable for production capacity forecasts, protocol benchmarks, SLO certification, or consistency proofs. This review strengthens the packet for task 683 but does not satisfy its independent-review requirement: the authoring assistant researched and reviewed the implementation, so it is not an unfamiliar, operationally experienced practitioner.

## Authoritative references checked

- MIT's queueing-model notes derive the stable M/M/1 quantities and require arrival rate below service rate: [MIT 1.041 queueing models](https://web.mit.edu/1.041/spring2023/lectures/L8-queuing-models-2023sp.pdf).
- NIST explains that percentile estimation has multiple accepted conventions rather than one universal interpolation rule: [NIST percentile guidance](https://www.itl.nist.gov/div898/handbook/prc/section2/prc262.htm).
- TCP provides a reliable, in-order byte stream, while applications needing ordered reliable delivery should not rely on bare UDP: [RFC 9293](https://datatracker.ietf.org/doc/rfc9293/) and [RFC 768](https://datatracker.ietf.org/doc/html/rfc768).
- MQTT delivery behavior depends on QoS and broker/session behavior; the protocol name alone is insufficient: [OASIS MQTT 5.0](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html).
- gRPC retries require an explicit policy for most failures and use bounded exponential backoff with jitter; deadlines should be set deliberately and propagated: [gRPC retry](https://grpc.io/docs/guides/retry/) and [gRPC deadlines](https://grpc.io/docs/guides/deadlines/).
- Google SRE documents retry amplification, retry budgets, randomized exponential backoff, overload shedding, and cascading-failure risk: [Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/).
- AWS independently recommends controlling retry count and using backoff with jitter: [Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/).

## Findings and dispositions

| ID    | Finding                                                                                                                                     | Disposition                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DS-01 | The M/M/1 formulas are correct for a stable queue, but the documentation claimed a 20% simulator comparison that the tests did not perform. | Removed the unsupported simulator-tolerance claim. The formula test and deterministic queue invariants are now described separately.  |
| DS-02 | SysSim uses nearest rank for percentiles, while established statistical tools expose several conventions.                                   | The chosen convention is now explicit; documentation warns against cross-tool comparison without matching methods.                    |
| DS-03 | Fixed protocol overheads could be mistaken for measured rankings.                                                                           | Every protocol assumption now declares an illustrative, non-benchmark evidence basis.                                                 |
| DS-04 | `lossRatePercent` operates as an independent per-attempt failure probability, not packet loss or TCP behavior.                              | Documentation now names the actual abstraction and excludes packet, retransmission, correlation, and protocol-native retry semantics. |
| DS-05 | Edge retry latency represents repeated attempt service time, not exponential-backoff delay.                                                 | Corrected the equation and limitation text. Backoff remains a separate resilience helper.                                             |
| DS-06 | Jitter was applied after the backoff ceiling and could exceed the advertised maximum.                                                       | The final jittered result is now capped and regression-tested.                                                                        |
| DS-07 | Cross-zone cost used a binary divisor despite decimal KB/GB labels used elsewhere.                                                          | Cost now converts decimal KB to decimal GB and has an exact regression assertion.                                                     |
| DS-08 | A quorum availability check does not establish quorum intersection, consistency, or linearizability.                                        | Documentation now limits the claim to read/write availability.                                                                        |
| DS-09 | Zone failures are explicit shared-fate experiments, not a general correlated-failure model.                                                 | Existing limitation is accurate; no hidden correlation was added.                                                                     |
| DS-10 | MQTT, gRPC, TCP, UDP, WebSocket, HTTP, and pub/sub labels must not silently grant delivery or ordering guarantees.                          | Existing non-guarantee fields are retained and cross-checked against the standards above.                                             |

## Residual review questions

An independent practitioner should focus on whether the fixed constants teach a misleading relative intuition, whether expected-value retries conceal tail behavior too strongly, whether queue naming invites an M/M/1 interpretation, and whether zone/quorum demonstrations are sufficiently prominent about consistency exclusions. Sign-off belongs in `distributed-systems-review-request.md`.
