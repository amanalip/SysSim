# Graph-aware bottleneck analysis

Bottleneck findings are limited to active production paths reachable from explicit client traffic sources. If no clients exist, root nodes are used as design-time sources. Cut, replication, and observability edges are excluded from production traversal.

## Rules

- A single point of failure is reported only when removing a reachable node disconnects other reachable components. Isolated nodes and replica counts without an actual route do not create production findings.
- Missing cache is limited to reachable read-heavy client-to-database paths that contain no recognized cache.
- Synchronous-chain analysis follows request and fallback edges on actual paths and stops at asynchronous components.
- Runtime metrics add capacity-overload, hot-partition, load-distribution-skew, and queue-overflow findings at explicit thresholds.
- Cycle-safe traversal prevents repeated work on cyclic request graphs.

Each finding includes the triggering path, exact metric where applicable, affected traffic estimate, impact score, confidence based on sample count, and a targeted remediation. Findings are deduplicated by type and component, retaining the highest-impact instance, then ranked by impact and affected traffic share.
