# Scientific validation

SysSim is an educational discrete-event simulator. Its validation strategy combines analytically calculable reference systems, deterministic schedules, seeded statistical checks, and behavioral invariants. It does not claim production-capacity-planning fidelity.

## Reference checks

| Area                       | Independent reference                                                                | Acceptance tolerance                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Stable single-server queue | M/M/1 equations: utilization `λ/μ`, mean time `1/(μ-λ)`, mean queue depth `ρ²/(1-ρ)` | Formula exact; simulator approximation within 20% for a seeded steady workload after warm-up |
| Rate limiting              | Hand-authored fixed-window and token-refill schedules                                | Exact decision sequence                                                                      |
| Round-robin routing        | Equal counts over a whole number of cycles                                           | Exact                                                                                        |
| Weighted routing           | Expected integer shares over a whole number of weight cycles                         | Exact; 3% tolerance for non-integral samples                                                 |
| Cache                      | Controlled miss, populate, hit, and expiry trace                                     | Exact event sequence; 5 percentage points for seeded hit-ratio workloads                     |
| Percentiles                | Independent nearest-rank implementation over unsorted samples                        | Exact                                                                                        |
| Throughput                 | Completed count divided by modeled measurement time                                  | Exact to floating-point precision                                                            |

The executable evidence lives in `src/__tests__/advanced-simulation-credibility.test.ts`. The small two-node latency reference is described in `docs/reference-systems.md`.

## Demand and throughput

Configured QPS is offered demand. Accepted QPS excludes arrivals rejected by bounded runtime capacity. Completed QPS counts finished requests. The UI and exports keep these values separate because treating requested demand as achieved throughput hides overload.

## Warm-up and measurement

`warmUpSec` labels the initial interval as warm-up. `measurementDurationSec` labels the bounded measurement interval and then reports completion. Metrics retain lifetime totals for transparency; consumers should select measurement-phase samples when comparing configurations.

## Clarity versus realism

SysSim intentionally favors understandable, deterministic rules over packet-level or vendor-specific realism:

- M/M/1 equations are a reference, not a claim that every component has Poisson arrivals or exponential service times.
- Protocol overhead is a documented constant and does not emulate full wire framing, congestion control, TLS negotiation, or kernel scheduling.
- Packet/request loss uses expected bounded attempts, not individual packets.
- Cross-zone latency uses a small educational constant; users should set base edge latency for measured environments.
- Correlated failures are modeled only through explicit zone membership and chaos actions. Hidden correlation is never inferred.
- Payload distributions are bounded fixed, uniform, or approximate lognormal samples, sufficient for comparative experiments but not trace reconstruction.

These constraints make cause and effect visible and runs reproducible. Results should support learning and relative comparisons, not SLO commitments or infrastructure purchasing decisions.
