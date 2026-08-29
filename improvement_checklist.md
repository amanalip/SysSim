# SysSim Improvement Checklist

This document is the long-term, living backlog for moving SysSim toward a defensible 100/100 quality standard. Complete work in small, independently verifiable batches and strike completed items with `- [x]`. Do not mark an item complete merely because code was written; its acceptance checks must also pass.

Every implementation checkbox from Phase 0 onward has a permanent numeric task ID. The introductory usage, baseline, and 100/100 definition checklists are reference material and intentionally remain unnumbered. You can request work by ID or range, for example: “complete task 42” or “work through tasks 1–10.” Do not renumber existing tasks after they are assigned. When adding new tasks, continue from the highest existing ID so references in earlier sessions remain valid.

## How to use this checklist

- [ ] Work from the highest-priority incomplete section unless a prerequisite requires a different order.
- [ ] Keep each implementation session narrowly scoped to one parent item or a small group of related subtasks.
- [ ] Before starting, record or review the relevant baseline behavior and tests.
- [ ] Add regression tests for every confirmed bug before or alongside its fix.
- [ ] Run the smallest relevant test set during development and the full verification suite before checking off a parent item.
- [ ] Update this document in the same change as the completed work.
- [ ] Check off child tasks individually; check off a parent only when every required child and acceptance criterion is complete.
- [ ] If a task is intentionally rejected, document the reason and replacement behavior instead of silently deleting it.
- [ ] Keep product claims aligned with implemented behavior at all times.

### Status conventions

- `[ ]` Not started or not yet verified.
- `[x]` Implemented and verified.
- `Blocked:` Add a short explanation immediately below the task when external input is required.
- `Decision:` Record important design choices in the relevant section and in architecture documentation.

### Priority conventions

- **P0 — Trust and correctness:** Incorrect simulation results, misleading features, data corruption, crashes, or legal ambiguity.
- **P1 — Production quality:** Reliability, validation, testing, accessibility, responsive design, and performance.
- **P2 — Maintainability:** Refactoring, developer experience, documentation, and operational maturity.
- **P3 — Advanced capability:** Deeper models, richer analysis, extensibility, and optional polish.

## Current verified baseline

- [x] Production build completes with TypeScript strict checks.
- [x] 252 unit and integration tests across 59 test files pass as of the August 28, 2026 client, messaging, and app-server milestone.
- [x] Seven Chromium Playwright tests pass, covering the app shell and all six edge purposes.
- [x] Production and full dependency audits report zero known vulnerabilities as of the August 2026 audit.
- [x] The application starts and the Web Worker simulation path runs in Chromium.
- [x] The repository was reviewed across UI, store, engine, scenarios, CI, documentation, dependencies, and live desktop/mobile behavior.
- [x] Live mobile QA at 390×844 verifies the app shell, responsive calculator interaction, no document-width overflow, and no console warnings/errors.
- [x] Re-run and update this baseline after each major milestone.

## Definition of a defensible 100/100

- [ ] No unresolved P0 or P1 defects.
- [ ] Every public product claim maps to implemented and tested behavior.
- [ ] Simulation semantics are documented, deterministic when seeded, and validated against reference calculations.
- [ ] All supported user-controlled configuration fields influence behavior or are explicitly labeled diagram-only.
- [ ] Imported and persisted data is schema-validated, versioned, bounded, and migration-tested.
- [ ] Unit, integration, worker, and end-to-end test suites cover critical workflows and failure paths.
- [ ] CI enforces formatting, linting, types, tests, coverage, browser tests, accessibility, security, and bundle budgets.
- [ ] Supported desktop, tablet, and mobile layouts are usable without clipping or inaccessible controls.
- [ ] Core workflows conform to WCAG 2.2 AA expectations.
- [ ] Performance remains inside documented budgets under representative scenarios and maximum supported QPS.
- [ ] Documentation, licensing, citations, and contribution guidance are accurate and current.
- [ ] An independent final audit finds no unresolved high- or medium-severity issue.

# Phase 0 — Product Contract and Measurement Rubric

## Define SysSim's product contract — P0

- [x] 1. Decide whether SysSim is primarily an educational architecture playground, a quantitative simulator, or both.
- [x] 2. Define which outputs are exact calculations, approximations, heuristics, or illustrative values.
- [x] 3. Add visible labels to estimated or heuristic outputs so users cannot mistake them for production capacity guarantees.
- [x] 4. Define the intended audience: interview candidates, students, instructors, architects, or production engineers.
- [x] 5. Define explicitly supported browsers, screen sizes, input methods, and Node.js versions.
- [x] 6. Define maximum supported graph size, zone count, QPS, simulation duration, and snapshot size.
- [x] 7. Define whether simulations represent requests, operations, messages, jobs, or a configurable mix.
- [x] 8. Define the meaning of `success`, `failure`, `timeout`, `dropped`, `queued`, `hit`, and `miss` across the engine and UI.
- [x] 9. Define whether node replica counts represent virtual capacity within one node or separate graph nodes.
- [x] 10. Define what an edge means: dependency, synchronous call, asynchronous delivery, replication, fallback, or arbitrary data flow.
- [x] 11. Document which behaviors are deliberately simplified and why.
- [x] 12. Review README feature claims against this contract and revise any premature claims.

### Acceptance criteria

- [x] 13. A new `docs/product-contract.md` explains the supported use cases and limitations without requiring source-code knowledge.
- [x] 14. Every metric and analysis panel links or points to the assumptions behind its values.
- [x] 15. No UI wording claims a behavior that the engine does not implement.

## Establish the scoring rubric — P1

- [x] 16. Convert the audit categories into a persistent weighted rubric totaling 100 points.
- [x] 17. Assign objective pass/fail evidence to every rubric item.
- [x] 18. Define automatic deductions for failing builds, tests, security checks, accessibility checks, or performance budgets.
- [x] 19. Define the minimum score required before a release can be called production-ready.
- [x] 20. Add a dated score history table to this document or a dedicated quality report.
- [x] 21. Re-score only after completing verification, not from implementation confidence alone.

# Phase 1 — Simulation Semantics and Core Correctness

## Replace ambiguous edge routing with explicit semantics — P0

- [x] 22. Introduce an edge-purpose type such as `request`, `fallback`, `async`, `fanout`, `replication`, and `observability`.
- [x] 23. Decide whether edge purpose is inferred from component types, explicitly selected by the user, or both.
- [x] 24. Separate load balancing from generic multi-edge routing.
- [x] 25. Replace the current non-load-balancer round-robin behavior mislabeled as fanout.
- [x] 26. Implement true fanout where one event produces independent downstream branches.
- [x] 27. Implement request/response paths where the caller waits for one or more downstream results.
- [x] 28. Implement fallback edges that run only after a failure or cache miss.
- [x] 29. Implement asynchronous edges whose producer latency stops at enqueue acknowledgement.
- [x] 30. Implement replication edges that do not count as end-user request paths.
- [x] 31. Prevent invalid edge-purpose and component combinations.
- [x] 32. Display edge purpose visually and accessibly on the canvas.
- [x] 33. Preserve edge purpose in JSON export, URL sharing, snapshots, undo, and redo.
- [x] 34. Add migrations for older saved graphs that do not contain edge purpose.
- [x] 35. Add deterministic unit tests for single path, branching, fanout, fallback, cycles, and disconnected graphs.
- [x] 36. Add E2E tests that create and simulate each edge-purpose pattern.

### Acceptance criteria

- [x] 37. The same graph and seed always produce the same route counts.
- [x] 38. A multi-edge app server does not silently load-balance unrelated dependencies.
- [x] 39. Fanout visits every intended branch and aggregates completion according to documented rules.
- [x] 40. Cycles terminate through documented TTL/hop-limit behavior rather than being silently treated as success.

## Correct cache behavior — P0

- [x] 41. Define a request key independent of the unique request ID so repeat accesses can hit cached content.
- [x] 42. Define configurable key distributions such as uniform, Zipfian/hot-key, and custom distributions.
- [x] 43. Make a cache hit terminate the configured cache-aside read path.
- [x] 44. Route cache misses to the origin/database fallback path.
- [x] 45. Populate the cache after a successful origin response.
- [x] 46. Model cache entry TTL where supported by configuration.
- [x] 47. Implement distinct LRU, LFU, FIFO, and TTL eviction behavior.
- [x] 48. Use configured cache size rather than a hard-coded entry limit.
- [x] 49. Use configured cache read latency for Redis and local cache types.
- [x] 50. Define CDN and browser-cache behavior separately from server-side cache behavior.
- [x] 51. Model cache failure and bypass behavior.
- [x] 52. Model cache stampede behavior and an optional request-coalescing mitigation.
- [x] 53. Ensure cache hits set consistent hop metadata and the intended particle color.
- [x] 54. Ensure cache hit/miss metrics agree between the cache model, component metrics, overall metrics, traces, and exports.
- [x] 55. Add seeded tests for expected hit ratios within a stated tolerance.
- [x] 56. Add tests proving that a higher hit rate reduces database QPS.
- [x] 57. Add tests proving that a cache outage increases origin load instead of arbitrarily failing half of requests.

### Acceptance criteria

- [x] 58. A 90% cache-hit configuration produces approximately 10% origin read traffic under a representative seeded workload.
- [x] 59. Trace output clearly shows hit termination or miss-to-origin behavior.
- [x] 60. The cyan cache-hit visualization is reachable and covered by a test.

## Implement correct asynchronous messaging — P0

- [x] 61. Model message queue, task queue, pub/sub, and event bus as distinct behaviors.
- [x] 62. Separate producer acknowledgement latency from consumer processing latency.
- [x] 63. Make queue depth depend on arrival and drain rates over simulation time.
- [x] 64. Use worker replica, concurrency, and processing-rate configuration when draining work.
- [x] 65. Use queue partition counts to limit or increase parallelism according to documented rules.
- [x] 66. Implement consumer groups and clarify whether each group receives each message.
- [x] 67. Implement pub/sub subscriber fanout.
- [x] 68. Implement delivery guarantees: at-most-once, at-least-once, and simulated exactly-once semantics.
- [x] 69. Model retries, retry delay/backoff, and dead-letter queues.
- [x] 70. Model ordering guarantees and partition-key ordering.
- [x] 71. Model queue retention and overflow/drop behavior.
- [x] 72. Avoid counting successful enqueue as successful downstream processing unless the metric explicitly means acceptance.
- [x] 73. Report producer success, consumer success, retry count, queue age, and dropped-message count separately.
- [x] 74. Add deterministic overload, recovery, retry, and DLQ tests.
- [x] 75. Validate the event-driven blueprint against the resulting semantics.

## Implement component-specific models — P0/P1

### Client

- [x] 76. Decide how per-client `requestRateQps` interacts with global traffic QPS.
- [x] 77. Model multiple clients without double-counting or ignoring configured rates.
- [x] 78. Apply configured connection type to protocol overhead where relevant.
- [x] 79. Support request payload, operation type, and key distribution inputs.

### Application server

- [x] 80. Replace the square-root latency reduction heuristic with a documented capacity/concurrency model.
- [x] 81. Enforce maximum connections.
- [x] 82. Model queueing latency when capacity is exceeded.
- [x] 83. Use replicas to scale capacity without unrealistically lowering intrinsic processing latency.
- [x] 84. Model CPU utilization from load and configured capacity.
- [x] 85. Define degraded-state behavior.

### Worker

- [x] 86. Use replica count, concurrency limit, processing rate, and retry limit.
- [x] 87. Track busy workers and queued work.
- [x] 88. Report processing latency and failure/retry metrics.

### Serverless

- [x] 89. Model warm-instance pools and cold-start probability over idle time.
- [x] 90. Enforce concurrency limits, timeout, and memory-related performance assumptions.
- [x] 91. Model throttling when concurrency is exhausted.
- [x] 92. Distinguish invocation failures from downstream failures.

### Load balancer

- [x] 93. Model round-robin, least-connections, consistent hashing, weighted routing, and IP hashing accurately.
- [x] 94. Maintain meaningful active-connection counts over request duration.
- [x] 95. Exclude unhealthy downstream targets.
- [x] 96. Implement health-check intervals and recovery delay.
- [x] 97. Model sticky sessions.
- [x] 98. Accept configurable weights for weighted routing.
- [x] 99. Report uneven distribution and unavailable-target failures.

### API gateway

- [x] 100. Enforce configured QPS rate limits.
- [x] 101. Apply authentication mode overhead.
- [x] 102. Enforce timeouts.
- [x] 103. Implement documented circuit-breaker behavior.
- [x] 104. Report throttling, timeout, and open-circuit metrics separately.

### CDN

- [x] 105. Apply hit ratio, TTL, origin shielding, and edge-location configuration.
- [ ] 106. Model cache-hit versus origin-fetch latency.
- [ ] 107. Define geographic latency assumptions.
- [ ] 108. Report origin offload and egress separately.

### DNS

- [ ] 109. Model DNS lookup latency and TTL caching.
- [ ] 110. Define simple, weighted, geolocation, and latency-based routing behavior.
- [ ] 111. Ensure DNS is not treated as a normal application hop after resolution unless intentionally configured.

### Firewall/WAF

- [ ] 112. Apply inspection latency and configured block rate.
- [ ] 113. Distinguish malicious-request rejection from infrastructure failure.
- [ ] 114. Model rule-count cost only if supported by documented assumptions.

### Reverse proxy

- [ ] 115. Enforce maximum connections.
- [ ] 116. Model compression latency and bandwidth reduction.
- [ ] 117. Implement documented cache rules or mark them diagram-only.
- [ ] 118. Model buffering/backpressure where supported.

### SQL database

- [ ] 119. Separate reads and writes using the configured workload ratio.
- [ ] 120. Route eligible reads to read replicas.
- [ ] 121. Keep writes on the primary unless a documented multi-primary model is selected.
- [ ] 122. Enforce maximum connections with measurable wait and rejection behavior.
- [ ] 123. Model isolation-level latency/throughput tradeoffs.
- [ ] 124. Model replication lag and failover assumptions.
- [ ] 125. Define sharding-key behavior and hot partitions if sharding is enabled.

### NoSQL database

- [ ] 126. Apply partition key and consistency-level behavior.
- [ ] 127. Model replica count and replication lag.
- [ ] 128. Define read/write quorum assumptions.
- [ ] 129. Detect hot partitions using the request-key distribution.

### Object storage

- [ ] 130. Apply latency, throughput, and storage-class configuration.
- [ ] 131. Separate request latency from bulk-transfer time.
- [ ] 132. Model request/response payload size.

### Search index

- [ ] 133. Apply shard and replica counts.
- [ ] 134. Separate indexing from query workload.
- [ ] 135. Use indexing and query latency configurations.
- [ ] 136. Detect shard imbalance where applicable.

### Graph database

- [ ] 137. Apply query latency and traversal-depth limits.
- [ ] 138. Define how traversal depth affects latency and capacity.

### Time-series database

- [ ] 139. Enforce write throughput.
- [ ] 140. Apply query latency and retention assumptions.
- [ ] 141. Model downsampling or cold-tier behavior only if explicitly supported.

### Rate limiter

- [ ] 142. Distinguish token bucket from leaky bucket instead of sharing one implementation.
- [ ] 143. Distinguish fixed window from sliding window.
- [ ] 144. Test window boundaries and burst capacity deterministically.
- [ ] 145. Decide whether rejected requests contribute processing latency.

### Authentication service

- [ ] 146. Apply validation latency and token type assumptions.
- [ ] 147. Model token/session cache behavior if exposed.
- [ ] 148. Define expiry/TTL effects or mark them diagram-only.

### Encryption/KMS service

- [ ] 149. Apply algorithm-specific overhead only where justified.
- [ ] 150. Define key-rotation effects or mark the setting diagram-only.
- [ ] 151. Avoid implying cryptographic security validation from latency simulation.

## Fix health-state semantics — P0

- [ ] 152. Define `healthy`, `degraded`, `overloaded`, and `down` behavior centrally.
- [ ] 153. Make degraded nodes apply documented latency, error-rate, or capacity penalties.
- [ ] 154. Derive overloaded state consistently from capacity rather than treating it as cosmetic.
- [ ] 155. Ensure down nodes are excluded from load-balancer selection.
- [ ] 156. Define recovery time and whether in-flight requests recover, retry, or fail.
- [ ] 157. Keep manual, chaos, and metrics-derived health states distinguishable.
- [ ] 158. Avoid overwriting a user's pre-existing unhealthy state when a chaos experiment ends.
- [ ] 159. Add state-transition tests for every component category.

## Correct chaos engineering drills — P0

- [ ] 160. Make “Primary Database Outage” exercise an actual failover path when replicas exist.
- [ ] 161. Report explicit failure when no valid failover target exists.
- [ ] 162. Make “Cache Stampede” bypass caches and increase origin traffic.
- [ ] 163. Add optional stampede-protection behavior for comparison.
- [ ] 164. Make “5x Flash Crowd” multiply traffic exactly once.
- [ ] 165. Store and restore the original QPS and traffic pattern after a flash-crowd drill.
- [ ] 166. Make “Ingress Network Partition” select a semantically valid ingress edge rather than blindly using the first edge.
- [ ] 167. Make “High Network Latency (400ms)” add the promised latency to the appropriate nodes or edges.
- [ ] 168. Record drill start time, affected targets, injected parameters, and observed result.
- [ ] 169. Support cancel/restore per drill rather than only global restoration.
- [ ] 170. Prevent overlapping drills from corrupting restoration state.
- [ ] 171. Add deterministic tests for injection, effects, and complete restoration.
- [ ] 172. Add an E2E test for every drill.

## Make randomness deterministic and reproducible — P0

- [ ] 173. Introduce a seeded pseudo-random number generator owned by each simulation run.
- [ ] 174. Remove direct `Math.random()` use from simulation models.
- [ ] 175. Allow users to view, copy, and optionally set the seed.
- [ ] 176. Include the seed in JSON exports, snapshots, traces, and bug reports where appropriate.
- [ ] 177. Add tests proving identical graph, configuration, seed, and steps yield identical results.
- [ ] 178. Add tests proving different seeds vary outcomes within expected statistical bounds.

## Implement a real discrete-event core — P1

- [ ] 179. Decide whether to retain tick-based approximation or build an event-priority queue.
- [ ] 180. If using discrete events, represent arrivals, node service completion, edge transfer, timeout, retry, queue drain, and recovery as scheduled events.
- [ ] 181. Track requests as genuinely in-flight instead of treating recently completed requests as active.
- [ ] 182. Calculate active connections from start/end events.
- [ ] 183. Support concurrent branches and join semantics.
- [ ] 184. Apply latency distributions rather than fixed or minimally randomized values.
- [ ] 185. Document simulation clock behavior at 0.5x through 10x.
- [ ] 186. Ensure UI rendering cadence is independent of simulation event throughput.
- [ ] 187. Bound memory use for events, traces, samples, and time series.
- [ ] 188. Benchmark event processing at supported graph and QPS limits.

## Correct metrics and percentile calculations — P0/P1

- [ ] 189. Define whether metrics are lifetime, rolling-window, or interval values.
- [ ] 190. Label them accordingly in the UI.
- [ ] 191. Use a documented quantile definition for p50, p95, and p99.
- [ ] 192. Avoid biased percentile indexing at small sample sizes.
- [ ] 193. Track failed-request latency separately from successful-request latency.
- [ ] 194. Calculate actual completed throughput rather than displaying configured input QPS as throughput.
- [ ] 195. Distinguish offered load, accepted load, completed throughput, and dropped load.
- [ ] 196. Report queue wait, service time, network time, and total latency separately.
- [ ] 197. Make utilization account for replica count consistently.
- [ ] 198. Make capacity calculations consistent between engine metrics and bottleneck detection.
- [ ] 199. Keep queue-depth metrics synchronized after draining, not only after enqueue.
- [ ] 200. Populate active DB connection metrics from the database model.
- [ ] 201. Report cache metrics from the cache model as the canonical source.
- [ ] 202. Avoid calling a completed-request sample `activeRequests`.
- [ ] 203. Add golden tests with hand-calculated small workloads.
- [ ] 204. Add statistical tests with tolerances for probabilistic workloads.

# Phase 2 — State Integrity, Persistence, and Synchronization

## Centralize graph mutation and worker synchronization — P0

- [ ] 205. Ensure `addNode` synchronizes the worker when simulation is active.
- [ ] 206. Ensure `addEdge` synchronizes the worker when simulation is active.
- [ ] 207. Ensure React Flow deletion changes use store actions that preserve history and synchronize the worker.
- [ ] 208. Decide whether node-position-only changes need worker synchronization and document the decision.
- [ ] 209. Remove redundant duplicate `syncGraph()` calls from callers once store behavior is authoritative.
- [ ] 210. Batch multi-node or multi-edge updates into one worker synchronization.
- [ ] 211. Attach a graph revision number to worker messages.
- [ ] 212. Ignore stale worker results from older graph revisions.
- [ ] 213. Add tests that mutate a running graph and immediately verify new routing behavior.
- [ ] 214. Add tests for rapid consecutive edits while the simulation runs.

## Remove store/engine circular coupling — P1

- [ ] 215. Identify the current coupling between the Zustand store and singleton simulation bridge.
- [ ] 216. Define a one-way command/event boundary between UI state and simulation state.
- [ ] 217. Move bridge lifecycle initialization to application composition rather than module import side effects.
- [ ] 218. Make the engine independently usable without DOM, localStorage, React, or Zustand.
- [ ] 219. Inject callbacks or an event bus into the bridge instead of importing the store from engine code.
- [ ] 220. Make worker fallback behavior independently testable.
- [ ] 221. Ensure tests do not create hidden singleton worker state across files.

## Add versioned architecture schemas — P0

- [ ] 222. Add a top-level schema version to exports, URL state, and snapshots.
- [ ] 223. Define runtime schemas for nodes, edges, zones, traffic configuration, and simulation metadata.
- [ ] 224. Validate component type, category, health state, protocols, IDs, coordinates, sizes, and all component-specific configuration.
- [ ] 225. Reject duplicate node, edge, and zone IDs.
- [ ] 226. Reject or repair dangling edges.
- [ ] 227. Reject non-finite numbers, negative sizes, and unsafe extreme values.
- [ ] 228. Bound maximum node, edge, zone, name, and text lengths.
- [ ] 229. Bound decompressed URL and imported-file size to prevent resource exhaustion.
- [ ] 230. Validate snapshot data read from localStorage before rendering.
- [ ] 231. Validate completed scenario IDs read from localStorage.
- [ ] 232. Validate the stored theme before applying it.
- [ ] 233. Add migrations for every historical schema version that remains supported.
- [ ] 234. Provide actionable import error messages identifying invalid fields.
- [ ] 235. Add malicious, malformed, partial, and old-version fixture tests.
- [ ] 236. Add round-trip tests for every supported component and edge type.

## Improve undo/redo correctness — P1

- [ ] 237. Define which actions create history entries.
- [ ] 238. Add history entries for node movement at drag completion rather than every movement frame.
- [ ] 239. Add history support for zone moves and resizes.
- [ ] 240. Ensure selection-only changes do not pollute history.
- [ ] 241. Ensure config edits are grouped sensibly rather than producing unexpected undo behavior.
- [ ] 242. Preserve and restore all semantically relevant graph fields.
- [ ] 243. Synchronize the worker after undo and redo exactly once.
- [ ] 244. Expose whether undo and redo are available and disable controls accordingly.
- [ ] 245. Add integration tests for mixed node, edge, zone, config, and layout history.

## Improve snapshot persistence — P1

- [ ] 246. Validate snapshots read from localStorage.
- [ ] 247. Handle quota-exceeded errors visibly rather than silently swallowing them.
- [ ] 248. Display corrupted-slot status and offer safe removal.
- [ ] 249. Include schema version and application version in each snapshot.
- [ ] 250. Prevent custom-name whitespace from producing blank names.
- [ ] 251. Add import/export of all snapshot slots if useful.
- [ ] 252. Confirm snapshot loading restores simulation state intentionally rather than accidentally.
- [ ] 253. Add tests for corruption, quota failures, migrations, and restoration.

## Improve Web Worker lifecycle and recovery — P1

- [ ] 254. Define typed message unions for all worker commands and responses.
- [ ] 255. Validate worker messages before using payloads.
- [ ] 256. Add worker-ready and graph-acknowledgement messages.
- [ ] 257. Prevent `start` before graph/config initialization acknowledgement.
- [ ] 258. Preserve current metrics and elapsed time during worker-to-main-thread fallback when feasible.
- [ ] 259. Prevent duplicate timers during repeated error, start, pause, and resume sequences.
- [ ] 260. Terminate the worker during application teardown or hot replacement.
- [ ] 261. Surface fallback mode to diagnostics without alarming ordinary users.
- [ ] 262. Add tests for worker initialization failure, runtime failure, stale messages, and recovery.

# Phase 3 — Analysis, Calculators, and Scenario Quality

## Make bottleneck detection graph-aware — P1

- [ ] 263. Detect whether nodes are actually reachable from traffic sources.
- [ ] 264. Detect SPOFs using path dominance/articulation logic rather than component type alone.
- [ ] 265. Avoid flagging unused or isolated components as production bottlenecks.
- [ ] 266. Detect missing caches only on eligible read-heavy database paths.
- [ ] 267. Detect synchronous chains by traversing actual paths rather than global node and edge counts.
- [ ] 268. Use edge semantics to exclude replication and observability links.
- [ ] 269. Implement hot-partition detection promised by the `BottleneckType` union.
- [ ] 270. Implement unbalanced-load detection.
- [ ] 271. Implement queue-overflow detection.
- [ ] 272. Deduplicate overlapping findings.
- [ ] 273. Rank findings by impact, confidence, and affected traffic share.
- [ ] 274. Explain every finding with the exact path and metrics that triggered it.
- [ ] 275. Add graph fixtures for false-positive and false-negative cases.

## Make health scoring evidence-based — P1

- [ ] 276. Define every pillar formula in documentation.
- [ ] 277. Do not report perfect availability or latency before a simulation has produced evidence.
- [ ] 278. Distinguish design-time heuristic scores from runtime telemetry scores.
- [ ] 279. Include confidence/sample-size indicators.
- [ ] 280. Make cost-efficiency scoring use actual estimated cost and workload rather than only replica count.
- [ ] 281. Make resilience scoring account for reachable redundant paths and failover capability.
- [ ] 282. Align recommendations with actual graph structure and simulation behavior.
- [ ] 283. Add hand-reviewed fixtures with expected score ranges.
- [ ] 284. Label the health radar as heuristic until externally validated.

## Extract and validate capacity-calculator logic — P1

- [ ] 285. Move formulas out of React components into pure typed functions.
- [ ] 286. Test production calculation functions rather than duplicating formulas in tests.
- [ ] 287. Define decimal versus binary unit conventions and use them consistently.
- [ ] 288. Clarify whether QPS includes both reads and writes.
- [ ] 289. Clarify request and response payload assumptions.
- [ ] 290. Make inbound/outbound bandwidth formulas match displayed explanations.
- [ ] 291. Replace the arbitrary DB connection formula with configurable service-time/concurrency assumptions.
- [ ] 292. Replace the “20% of daily writes” cache recommendation with a documented working-set model.
- [ ] 293. Incorporate headroom, failover capacity, and utilization targets into server count.
- [ ] 294. Add replication, indexing, metadata, compression, and growth overhead options.
- [ ] 295. Add range/uncertainty outputs rather than false precision where assumptions dominate.
- [ ] 296. Add boundary, unit, and golden-reference tests.
- [ ] 297. Provide downloadable calculation assumptions with exports.

## Make cost estimation transparent — P1

- [ ] 298. Clearly label all prices as illustrative unless connected to dated provider pricing data.
- [ ] 299. Display the pricing date and region.
- [ ] 300. Move pricing tables and formulas out of the component.
- [ ] 301. Explain mapping from SysSim components to provider instance profiles.
- [ ] 302. Model storage, request, bandwidth, managed-service, and redundancy costs separately.
- [ ] 303. Do not apply spot discounts to services that are not eligible.
- [ ] 304. Add currency selection only if supported by real conversion data.
- [ ] 305. Add deterministic tests for every component/provider mapping.
- [ ] 306. Add a disclaimer that estimates are not billing quotes.

## Audit all 101 scenarios — P0/P1

- [ ] 307. Validate unique IDs and slugs.
- [ ] 308. Validate every reference architecture against the runtime schema.
- [ ] 309. Validate every edge against supported protocol and edge-purpose types.
- [ ] 310. Add `UDP` to the protocol model and UI if it is intended to remain in gaming/communication scenarios.
- [ ] 311. Remove all `as any` protocol escapes from scenario definitions.
- [ ] 312. Ensure reference architecture node IDs and config IDs agree.
- [ ] 313. Ensure reference designs use only implemented component behavior or clearly disclose approximations.
- [ ] 314. Check constraints for internally consistent units and plausible orders of magnitude.
- [ ] 315. Fact-check problem statements, hints, and discussion answers.
- [ ] 316. Add source-to-claim notes so citations support the exact associated content.
- [ ] 317. Prefer primary sources, standards, papers, and official engineering publications.
- [ ] 318. Replace currently dead citation URLs.
- [ ] 319. Build an automated scheduled link checker with allowlisted handling for 403/406 responses.
- [ ] 320. Record the last verified date for every citation.
- [ ] 321. Ensure external links have accessible names and safe `rel` attributes.
- [ ] 322. Add scenario-content linting for missing fields, duplicates, invalid URLs, and unsupported protocols.
- [ ] 323. Add category-level review ownership so future edits remain consistent.

## Improve scenario learning workflows — P2

- [ ] 324. Distinguish challenge mode from reference-design mode clearly.
- [ ] 325. Preserve user work when opening scenario details unless the user explicitly replaces it.
- [ ] 326. Add confirmation before destructive scenario loads when unsaved work exists.
- [ ] 327. Save per-scenario progress, hints, notes, and attempts with schema validation.
- [ ] 328. Explain why a reference architecture is one valid answer rather than the only answer.
- [ ] 329. Tie interview prompts to observable simulation experiments where possible.
- [ ] 330. Add comparison tools between user and reference designs without treating visual difference as incorrectness.
- [ ] 331. Make completion status reflect user intent without implying automated correctness grading.

# Phase 4 — Testing and Continuous Integration

## Restructure the test suite around behavior — P1

- [ ] 332. Replace batch/audit-number filenames with domain-oriented names.
- [ ] 333. Consolidate overlapping regression tests after preserving coverage.
- [ ] 334. Keep bug-history context in test names or comments where useful.
- [ ] 335. Stop testing locally duplicated formulas and constants.
- [ ] 336. Prefer public behavior over access to private fields through `as any`.
- [ ] 337. Introduce builders/fixtures for graphs, components, traffic, and seeded simulations.
- [ ] 338. Reset global store, timers, localStorage, worker mocks, and randomness consistently.
- [ ] 339. Enable fake timers only in tests that need them.
- [ ] 340. Ensure no test passes because another test left singleton state behind.
- [ ] 341. Add mutation testing or targeted fault injection for the most critical engine modules.

## Expand engine unit coverage — P0/P1

- [ ] 342. Cover every component model and every configuration field.
- [ ] 343. Cover every traffic pattern, including boundary seconds and custom schedules.
- [ ] 344. Cover zero, fractional, maximum, and invalid QPS.
- [ ] 345. Cover disconnected nodes, dangling edges, cycles, self-loops, and very deep paths.
- [ ] 346. Cover every load-balancer algorithm statistically and deterministically.
- [ ] 347. Cover cache hit/miss/fill/eviction/TTL behavior.
- [ ] 348. Cover queue arrival, drain, overflow, retry, and recovery behavior.
- [ ] 349. Cover DB pool saturation, read replicas, writes, lag, and failover.
- [ ] 350. Cover health transitions and all chaos effects.
- [ ] 351. Cover percentile and rolling-window math against golden values.
- [ ] 352. Cover reset, pause, resume, step, stop, and graph mutation at every state.
- [ ] 353. Cover seeded reproducibility.

## Add integration tests — P1

- [ ] 354. Test Zustand actions with a real bridge test double.
- [ ] 355. Test worker protocol end-to-end using the actual engine implementation.
- [ ] 356. Test architecture import through validation into store and engine.
- [ ] 357. Test snapshot save/load through localStorage.
- [ ] 358. Test URL encode/decode through application initialization.
- [ ] 359. Test undo/redo across worker synchronization.
- [ ] 360. Test scenario loading and traffic configuration synchronization.
- [ ] 361. Test metric updates flowing from worker to panels.

## Expand component and accessibility tests — P1

- [ ] 362. Render each major component with representative states.
- [ ] 363. Test empty, loading, running, paused, failure, overflow, and error states.
- [ ] 364. Test keyboard operation for palette, canvas, modals, tabs, dropdowns, and scenario cards.
- [ ] 365. Test focus entry, focus trap, escape handling, and focus restoration for every modal.
- [ ] 366. Test accessible names for icon-only controls.
- [ ] 367. Run automated accessibility checks on core component states.
- [ ] 368. Avoid snapshots as the sole assertion for interaction behavior.

## Build a meaningful Playwright suite — P1

- [ ] 369. Load the starter architecture and verify nodes and edges.
- [ ] 370. Add a component by button.
- [ ] 371. Add a component by drag-and-drop.
- [ ] 372. Connect nodes and change edge protocol.
- [ ] 373. Edit every category of component properties.
- [ ] 374. Start, pause, resume, step, stop, and reset a simulation.
- [ ] 375. Verify metrics update from the Web Worker.
- [ ] 376. Inject and restore node and edge failures.
- [ ] 377. Run every chaos drill.
- [ ] 378. Open and use the metrics, bottleneck, health, trace, and cost tabs.
- [ ] 379. Save and restore snapshots.
- [ ] 380. Export and re-import architecture JSON.
- [ ] 381. Generate and reload a shared URL.
- [ ] 382. Exercise undo, redo, duplicate, delete, auto-layout, and keyboard shortcuts.
- [ ] 383. Search and load scenarios.
- [ ] 384. Verify a representative scenario from each category.
- [ ] 385. Test dark and light themes.
- [ ] 386. Test mobile and tablet navigation once responsive design exists.
- [ ] 387. Capture trace/video/screenshots on failure in CI.
- [ ] 388. Run Chromium, Firefox, and WebKit for release qualification if they are supported.

## Add coverage and quality thresholds — P1

- [ ] 389. Add unit-test coverage reporting.
- [ ] 390. Establish initial realistic thresholds without hiding untested files.
- [ ] 391. Raise thresholds as critical domains gain coverage.
- [ ] 392. Require near-complete branch coverage for schema validation and core engine transitions.
- [ ] 393. Publish coverage artifacts in CI.
- [ ] 394. Add a bundle-size report.
- [ ] 395. Add duplicate-code or complexity reporting if it provides actionable value.

## Correct and strengthen CI — P1

- [ ] 396. Add a real lint script.
- [ ] 397. Add a standalone type-check script.
- [ ] 398. Rename CI steps so their labels match the commands they execute.
- [ ] 399. Run formatting checks.
- [ ] 400. Run unit and integration tests.
- [ ] 401. Run the production build.
- [ ] 402. Install Playwright browsers and run E2E tests.
- [ ] 403. Run automated accessibility tests.
- [ ] 404. Run dependency and lockfile security checks.
- [ ] 405. Run citation validation on a schedule rather than blocking every pull request on third-party availability.
- [ ] 406. Enforce bundle-size and performance budgets.
- [ ] 407. Upload test, coverage, browser trace, and bundle artifacts.
- [ ] 408. Use concurrency cancellation for superseded CI runs where appropriate.
- [ ] 409. Pin or securely manage GitHub Action versions.
- [ ] 410. Add branch protection requiring all mandatory checks.
- [ ] 411. Ensure deployment depends on successful release-quality checks.

# Phase 5 — Responsive Design and Accessibility

## Define responsive layouts — P1

- [ ] 412. Choose supported breakpoints based on content needs, not device brand names.
- [ ] 413. Design desktop, compact desktop/tablet, and mobile interaction models.
- [ ] 414. Replace the permanently fixed 320-pixel sidebar with a collapsible drawer on constrained widths.
- [ ] 415. Collapse header actions into an accessible overflow menu.
- [ ] 416. Ensure the canvas remains usable when side panels are closed or docked.
- [ ] 417. Convert the properties panel to a drawer or sheet on narrow screens.
- [ ] 418. Make simulation controls wrap, collapse, or open in a dedicated panel without obscuring content.
- [ ] 419. Make metrics panels usable in portrait and landscape orientations.
- [ ] 420. Set sensible minimum canvas dimensions and provide an unsupported-size message if necessary.
- [ ] 421. Ensure modals fit small viewports and their content scrolls correctly.
- [ ] 422. Ensure touch targets are at least 44 by 44 CSS pixels where practical.
- [ ] 423. Support touch-based node placement, selection, connection, zoom, and pan if mobile editing is claimed.
- [ ] 424. Add visual regression screenshots for representative viewport sizes.

### Acceptance viewports

- [ ] 425. 360 × 800 portrait.
- [ ] 426. 390 × 844 portrait.
- [ ] 427. 768 × 1024 tablet portrait.
- [ ] 428. 1024 × 768 tablet landscape.
- [ ] 429. 1280 × 720 compact desktop.
- [ ] 430. 1440 × 900 standard desktop.
- [ ] 431. 1920 × 1080 large desktop.

## Meet keyboard-accessibility expectations — P1

- [ ] 432. Replace clickable non-semantic `<div>` elements with buttons or add complete keyboard semantics.
- [ ] 433. Ensure all interactive controls are reachable in a logical tab order.
- [ ] 434. Add visible focus indicators with sufficient contrast.
- [ ] 435. Ensure keyboard shortcuts do not conflict with browser or assistive-technology conventions.
- [ ] 436. Provide a way to disable or customize single-key shortcuts.
- [ ] 437. Ensure shortcuts do not fire while editing content or interacting with modal controls.
- [ ] 438. Add keyboard equivalents for drag-only operations.
- [ ] 439. Make canvas nodes and edges operable without a pointer.
- [ ] 440. Announce selection and graph changes to assistive technology where appropriate.

## Implement accessible modal/dialog behavior — P1

- [ ] 441. Give every modal `role="dialog"` or use a semantic dialog implementation.
- [ ] 442. Set `aria-modal="true"` where appropriate.
- [ ] 443. Connect each dialog to an accessible title and description.
- [ ] 444. Move focus into the dialog when it opens.
- [ ] 445. Trap focus inside the dialog.
- [ ] 446. Close on Escape unless an irreversible action is in progress.
- [ ] 447. Restore focus to the invoking control on close.
- [ ] 448. Prevent background content from being interactable or exposed while modal.
- [ ] 449. Add accessible names to close buttons.

## Improve forms, tabs, status, and charts — P1

- [ ] 450. Associate every input with a programmatic label.
- [ ] 451. Add descriptions, units, valid ranges, and error messages.
- [ ] 452. Use `aria-invalid` and error associations for invalid values.
- [ ] 453. Implement correct tablist/tab/tabpanel semantics.
- [ ] 454. Expose toggle pressed/selected state through ARIA.
- [ ] 455. Add live-region announcements for toasts, simulation state, failures, and completed exports.
- [ ] 456. Ensure color is not the only indicator of health, severity, cache hit, or failure.
- [ ] 457. Provide textual summaries or tables for every chart.
- [ ] 458. Verify screen-reader reading order for canvas nodes, edges, and panels.
- [ ] 459. Test zoom up to 200% without loss of content or functionality.

## Verify visual accessibility — P1

- [ ] 460. Audit foreground/background contrast in both themes.
- [ ] 461. Audit focus-indicator contrast.
- [ ] 462. Support reduced-motion preferences for particles, transitions, and confetti.
- [ ] 463. Ensure animation can be paused when it is not essential.
- [ ] 464. Avoid rapid flashing during chaos or error visualization.
- [ ] 465. Test high-contrast/forced-colors mode where supported.
- [ ] 466. Avoid relying on tiny text below readable minimums.
- [ ] 467. Document WCAG 2.2 AA exceptions, if any, with remediation plans.

# Phase 6 — Performance and Scalability

## Reduce initial bundle size — P1

- [ ] 468. Establish a JavaScript and CSS budget for the initial route.
- [ ] 469. Lazy-load scenario detail/data where practical.
- [ ] 470. Lazy-load charts and advanced metrics panels.
- [ ] 471. Lazy-load infrequently used modals and export tooling.
- [ ] 472. Split large scenario datasets by category or dynamic import.
- [ ] 473. Inspect tree-shaking for icon, chart, motion, table, and image-export dependencies.
- [ ] 474. Remove unused direct dependencies such as internal packages that are not intentionally imported.
- [ ] 475. Configure stable manual chunks only where measurement shows a benefit.
- [ ] 476. Re-run bundle analysis after each split.
- [ ] 477. Keep worker code in its own chunk and ensure it is cached efficiently.

### Suggested initial budgets

- [ ] 478. Initial application JavaScript below 250 KB gzip.
- [ ] 479. Initial CSS below 75 KB uncompressed unless justified.
- [ ] 480. No unplanned individual JavaScript chunk above 500 KB minified.

## Optimize engine hot paths — P1

- [ ] 481. Pre-index nodes by ID rather than searching the node array on every hop.
- [ ] 482. Pre-index outgoing and incoming edges by node ID.
- [ ] 483. Avoid filtering the complete edge array on every request hop.
- [ ] 484. Avoid sorting complete latency arrays for every 100ms metrics update.
- [ ] 485. Use bounded histograms, sketches, or interval aggregation for percentiles at scale.
- [ ] 486. Avoid cloning custom schedules on every QPS calculation.
- [ ] 487. Bound per-node statistics and trace retention explicitly.
- [ ] 488. Measure structured-clone/postMessage overhead from worker to UI.
- [ ] 489. Throttle UI metric updates independently from engine steps.
- [ ] 490. Avoid re-rendering all nodes for high-frequency telemetry changes where possible.
- [ ] 491. Add profiling for 10, 100, 500, and maximum-supported node graphs.

## Add stress and endurance tests — P1/P2

- [ ] 492. Benchmark minimum, typical, and maximum QPS.
- [ ] 493. Benchmark long-running simulations for memory growth.
- [ ] 494. Benchmark large graphs and dense edge sets.
- [ ] 495. Benchmark high fanout and large queue depths.
- [ ] 496. Measure worker CPU time, UI frame rate, memory, and message size.
- [ ] 497. Verify pause, reset, and graph edits remain responsive under load.
- [ ] 498. Fail gracefully or clamp inputs beyond supported limits.
- [ ] 499. Publish tested limits and representative hardware assumptions.

## Improve rendering performance — P2

- [ ] 500. Profile React renders while simulation metrics update.
- [ ] 501. Use focused Zustand selectors to avoid subscribing components to unrelated state.
- [ ] 502. Stabilize callback and derived-value identities where meaningful.
- [ ] 503. Virtualize long scenario and palette lists if measurement warrants it.
- [ ] 504. Reduce particle count adaptively under load and reduced-motion settings.
- [ ] 505. Avoid unnecessary full-canvas image export work.
- [ ] 506. Add performance regression checks for core interactions.

# Phase 7 — Security and Reliability

## Harden untrusted data handling — P0

- [ ] 507. Treat URL hashes, imported files, localStorage, and future shared content as untrusted input.
- [ ] 508. Apply versioned runtime validation before writing any imported state to the store.
- [ ] 509. Reject prototype-polluting keys and unexpected fields where relevant.
- [ ] 510. Limit file size before reading and JSON parsing.
- [ ] 511. Limit decompressed URL payload size.
- [ ] 512. Limit text lengths displayed in nodes, zones, snapshots, and scenarios.
- [ ] 513. Ensure invalid data cannot create infinite simulation work or render explosions.
- [ ] 514. Fuzz architecture decoding and import validation.
- [ ] 515. Add safe recovery behavior for corrupted persisted state.

## Add browser security controls — P1

- [ ] 516. Define a Content Security Policy compatible with the deployment model.
- [ ] 517. Decide whether externally hosted Google Fonts are acceptable; self-host if privacy or CSP requirements demand it.
- [ ] 518. Configure `Referrer-Policy`, `X-Content-Type-Options`, and relevant Permissions Policy headers where hosting permits.
- [ ] 519. Verify all external links use safe opener/referrer behavior.
- [ ] 520. Ensure exported filenames and user-provided names cannot cause unsafe behavior.
- [ ] 521. Confirm no sensitive data is unintentionally included in share URLs.
- [ ] 522. Warn users that URL-encoded architectures may be stored in browser history, logs, or referrers.

## Maintain dependency and supply-chain hygiene — P1

- [ ] 523. Keep lockfile-based reproducible installation with `npm ci` in CI.
- [ ] 524. Run production and development dependency audits regularly.
- [ ] 525. Configure automated dependency update pull requests.
- [ ] 526. Review major-version upgrades deliberately rather than applying them blindly.
- [ ] 527. Remove redundant or unused dependencies.
- [ ] 528. Document why direct low-level dependencies are required.
- [ ] 529. Generate and retain an SBOM for releases if distribution warrants it.
- [ ] 530. Pin release tooling and GitHub Actions appropriately.
- [ ] 531. Add a security policy describing responsible vulnerability reporting.

## Improve error handling and observability — P1

- [ ] 532. Add an application-level error boundary.
- [ ] 533. Provide recovery actions for canvas/render failures.
- [ ] 534. Replace silently swallowed persistence errors with user-visible, non-disruptive feedback.
- [ ] 535. Log diagnostic context without leaking architecture content unexpectedly.
- [ ] 536. Add a copyable diagnostic report containing app version, browser, schema version, and simulation seed.
- [ ] 537. Distinguish user errors, validation errors, engine errors, worker errors, and export errors.
- [ ] 538. Ensure failure to export PNG does not leave misleading success notifications.
- [ ] 539. Add tests for every user-visible error state.

# Phase 8 — Code Architecture and Maintainability

## Decompose the global Zustand store — P1/P2

- [ ] 540. Separate UI, graph, simulation, scenario, persistence, toast, and calculator state into coherent slices.
- [ ] 541. Keep pure graph operations independent of React and bridge side effects.
- [ ] 542. Introduce typed selectors for high-frequency consumers.
- [ ] 543. Avoid subscribing large components to the full store.
- [ ] 544. Centralize reset behavior so initial objects are not accidentally shared or mutated.
- [ ] 545. Document side effects for each action.
- [ ] 546. Add slice-level tests.

## Strengthen TypeScript modeling — P1

- [ ] 547. Remove avoidable `any` casts from production code.
- [ ] 548. Type React Flow nodes and edges using generics rather than repeated double casts.
- [ ] 549. Replace generic partial config updates with component-discriminated update helpers where practical.
- [ ] 550. Ensure protocols used by scenarios are part of `EdgeProtocol`.
- [ ] 551. Add exhaustive switches for component and protocol behavior.
- [ ] 552. Use `never` checks so newly added component types cannot silently receive default simulation behavior.
- [ ] 553. Type worker messages as discriminated unions.
- [ ] 554. Type imported schemas separately from validated domain objects.
- [ ] 555. Consider branded IDs or helper types for node, edge, zone, request, and scenario IDs.
- [ ] 556. Keep runtime schema and TypeScript types synchronized through generation or shared definitions.

## Break up oversized modules — P2

- [ ] 557. Split the simulation engine into routing, scheduling, component execution, metrics, and state lifecycle modules.
- [ ] 558. Split component property editors into type-specific subcomponents.
- [ ] 559. Split metrics dashboard views into independently loaded components.
- [ ] 560. Extract calculator formulas and formatting.
- [ ] 561. Split scenario data from scenario registry metadata where useful for code loading.
- [ ] 562. Keep files cohesive rather than enforcing an arbitrary line limit.
- [ ] 563. Add architecture dependency rules to prevent UI-to-engine/store cycles.

## Standardize code quality tooling — P1/P2

- [ ] 564. Add ESLint with TypeScript and React rules appropriate to the project.
- [ ] 565. Add Prettier or another consistent formatter.
- [ ] 566. Add scripts for `lint`, `lint:fix`, `format`, `format:check`, and `typecheck`.
- [ ] 567. Remove stale comments and misleading terminology such as round-robin being called fanout.
- [ ] 568. Define import ordering and unused-code rules.
- [ ] 569. Enforce accessibility lint rules as a supplement to real testing.
- [ ] 570. Avoid inline styles where reusable semantic styles improve maintainability.
- [ ] 571. Add pre-commit hooks only if they do not duplicate slow CI unnecessarily.

## Improve IDs and time handling — P2

- [ ] 572. Replace timestamp-plus-short-random IDs with collision-resistant IDs.
- [ ] 573. Make IDs injectable or deterministic in tests.
- [ ] 574. Centralize simulation time rather than mixing simulation time and wall-clock time.
- [ ] 575. Ensure all displayed timestamps have explicit locale/timezone expectations.
- [ ] 576. Avoid relying on `Date.now()` for semantic ordering when multiple events can occur in one millisecond.

# Phase 9 — User Experience and Product Polish

## Protect users from destructive actions — P1

- [ ] 577. Confirm before clearing a non-empty canvas.
- [ ] 578. Confirm before replacing unsaved work with a scenario, import, snapshot, or shared URL.
- [ ] 579. Provide undo after feasible destructive actions.
- [ ] 580. Distinguish “clear canvas” from “reset simulation metrics.”
- [ ] 581. Warn before deleting zones containing components if containment is semantic.
- [ ] 582. Ensure repeated rapid clicks cannot duplicate destructive operations.

## Improve canvas interaction clarity — P1/P2

- [ ] 583. Explain edge direction and purpose during connection creation.
- [ ] 584. Display why a connection is discouraged before or immediately after creation.
- [ ] 585. Decide whether invalid connections should be rejected rather than merely warned.
- [ ] 586. Provide a discoverable connection-mode tutorial.
- [ ] 587. Make selected node and edge state visually unambiguous.
- [ ] 588. Keep floating node controls accessible without accidental canvas operations.
- [ ] 589. Provide multi-select operations if Ctrl/Cmd+A claims all nodes are selected.
- [ ] 590. Ensure deletion works consistently for React Flow multi-selection.
- [ ] 591. Preserve zone containment during all movement and layout operations.
- [ ] 592. Add alignment/distribution helpers if they materially improve diagram construction.

## Improve simulation feedback — P1

- [ ] 593. Show the active seed, elapsed simulation time, offered load, and completed throughput.
- [ ] 594. Explain when the engine is warming up or lacks enough samples for percentiles.
- [ ] 595. Surface overload, dropped traffic, and stale worker state immediately.
- [ ] 596. Clarify whether speed changes simulation time, UI playback, or both.
- [ ] 597. Provide a run summary after stop.
- [ ] 598. Allow traces to be filtered by status, route, node, and time.
- [ ] 599. Make metric units and rolling windows visible.
- [ ] 600. Provide empty-state explanations instead of optimistic zero-derived grades.

## Improve import, export, and sharing UX — P1/P2

- [ ] 601. Display schema/application version in JSON exports.
- [ ] 602. Preserve all supported edge fields, including bandwidth and latency, during serialization.
- [ ] 603. Preview imported architecture metadata before replacement.
- [ ] 604. Offer validation warnings without partially loading invalid state.
- [ ] 605. Handle clipboard-unavailable environments gracefully.
- [ ] 606. Warn when a share URL exceeds practical browser/service length limits.
- [ ] 607. Consider file or hosted sharing for oversized architectures if the product scope permits it.
- [ ] 608. Add deterministic export names or optional user-provided names.
- [ ] 609. Test PNG output in both themes and at high device-pixel ratios.

## Improve theming and visual consistency — P2

- [ ] 610. Verify every component in dark and light themes.
- [ ] 611. Replace hard-coded colors with semantic tokens where appropriate.
- [ ] 612. Ensure status colors remain consistent across nodes, traces, charts, toasts, and panels.
- [ ] 613. Audit chart palettes for color-vision deficiencies.
- [ ] 614. Ensure external font failure has acceptable fallbacks.
- [ ] 615. Add a reduced-motion mode and honor the system preference.

# Phase 10 — Documentation, Licensing, and Governance

## Resolve licensing immediately — P0

- [ ] 616. Decide whether the project is MIT or GNU GPLv3.
- [ ] 617. Make `README.md`, `LICENSE`, `package.json`, repository metadata, and release artifacts agree.
- [ ] 618. Add the appropriate copyright holder and year information.
- [ ] 619. Review dependency-license compatibility with the chosen project license.
- [ ] 620. Document any third-party assets or content requiring attribution.
- [ ] 621. Do not publish a release while the current MIT/GPL contradiction remains unresolved.

## Expand README documentation — P1/P2

- [ ] 622. Add a screenshot or short demo showing the primary workflow.
- [ ] 623. Explain the product contract and simulation limitations.
- [ ] 624. Document the exact supported Node.js range.
- [ ] 625. Prefer `npm ci` for reproducible clean installs where appropriate.
- [ ] 626. Document the GitHub Pages base path and local root URL differences.
- [ ] 627. List all development scripts, including future lint/type/E2E scripts.
- [ ] 628. Explain architecture import, export, snapshot, and share privacy implications.
- [ ] 629. Explain how metrics and calculators derive their outputs.
- [ ] 630. Link to architecture, testing, contributing, security, and changelog documents.
- [ ] 631. Keep the feature list generated or reviewed against actual implementation.

## Add architecture documentation — P2

- [ ] 632. Document module boundaries and dependency direction.
- [ ] 633. Document store slices and state ownership.
- [ ] 634. Document the main-thread/worker message flow.
- [ ] 635. Document simulation entities, events, timing, and routing semantics.
- [ ] 636. Document persistence schemas and migrations.
- [ ] 637. Document metrics definitions and sampling windows.
- [ ] 638. Add decision records for major simulation tradeoffs.
- [ ] 639. Include diagrams only where they clarify relationships better than prose.

## Add contributor and maintenance guidance — P2

- [ ] 640. Add `CONTRIBUTING.md` with setup, branch, test, review, and checklist expectations.
- [ ] 641. Add `SECURITY.md` with supported versions and reporting instructions.
- [ ] 642. Add a changelog or release-note process.
- [ ] 643. Add pull-request and issue templates.
- [ ] 644. Define code ownership or review responsibilities for engine, scenarios, and UI.
- [ ] 645. Document how to add a component type without missing defaults, properties, engine behavior, tests, icons, and scenarios.
- [ ] 646. Document how to add or edit scenarios and verify citations.
- [ ] 647. Document release and rollback procedures.

## Maintain citation quality — P1

- [ ] 648. Replace the nine URLs returning HTTP 404 during the August 2026 audit.
- [ ] 649. Investigate or replace the five URLs that failed DNS resolution or timed out.
- [ ] 650. Treat 403/406 results separately because they may block automated clients while remaining valid in browsers.
- [ ] 651. Store citation verification dates.
- [ ] 652. Prefer stable document URLs, DOI links, RFCs, and archived official pages.
- [ ] 653. Avoid using a generic home page when a specific primary source exists.
- [ ] 654. Add scheduled reporting for newly broken links.
- [ ] 655. Review source relevance, not merely HTTP availability.

# Phase 11 — Release Engineering and Operational Readiness

## Define release quality gates — P1

- [ ] 656. Require clean install, lint, typecheck, unit, integration, build, E2E, accessibility, and security checks.
- [ ] 657. Require no P0/P1 issue tagged for the release milestone.
- [ ] 658. Require license and citation checks.
- [ ] 659. Require bundle and performance budgets.
- [ ] 660. Require schema migration tests for persistence changes.
- [ ] 661. Require manual exploratory testing of critical workflows.
- [ ] 662. Produce release notes with breaking changes and migration behavior.

## Improve deployment validation — P1/P2

- [ ] 663. Test the built application under the `/SysSim/` base path rather than only the development root.
- [ ] 664. Run a post-build preview E2E suite against production assets.
- [ ] 665. Verify worker, favicon, CSS, fonts, and dynamic chunks resolve under GitHub Pages.
- [ ] 666. Verify direct navigation and 404 redirect behavior.
- [ ] 667. Verify shared URL hashes survive the deployment redirect path.
- [ ] 668. Add a post-deployment smoke check.
- [ ] 669. Document rollback to the previous known-good deployment.

## Add versioning and diagnostics — P2

- [ ] 670. Display the application version in an About or diagnostics surface.
- [ ] 671. Embed build commit and build timestamp where useful.
- [ ] 672. Include schema and engine version in exported architectures.
- [ ] 673. Make simulation-result comparisons reject or warn about incompatible engine versions.
- [ ] 674. Add a user-friendly diagnostic export for bug reports.

# Phase 12 — Advanced Simulation Credibility

## Validate the engine scientifically — P1/P3

- [ ] 675. Create small reference systems with analytically calculable results.
- [ ] 676. Compare queue behavior against established queueing-theory cases.
- [ ] 677. Validate rate limiters against known request schedules.
- [ ] 678. Validate load-balancer distributions statistically.
- [ ] 679. Validate cache behavior against controlled key traces.
- [ ] 680. Validate percentiles and throughput against external scripts or reference implementations.
- [ ] 681. Publish acceptable error tolerances for approximations.
- [ ] 682. Document where the engine intentionally favors learning clarity over realism.
- [ ] 683. Have simulation assumptions reviewed by an experienced distributed-systems practitioner.

## Add workload modeling — P3

- [ ] 684. Model read/write/compute/message operation mixes.
- [ ] 685. Model request and response payload distributions.
- [ ] 686. Model hot keys and skewed partitions.
- [ ] 687. Model diurnal, burst, ramp, spike, and custom trace workloads.
- [ ] 688. Allow importing a bounded workload trace.
- [ ] 689. Model correlated failures only if clearly documented.
- [ ] 690. Support warm-up and measurement intervals.
- [ ] 691. Separate configured demand from capacity-constrained throughput.

## Add network modeling — P3

- [ ] 692. Add UDP if supported by bundled scenarios.
- [ ] 693. Model bandwidth transfer time using payload size.
- [ ] 694. Model propagation/base latency independently.
- [ ] 695. Model packet/request loss and retry behavior.
- [ ] 696. Model connection setup and keep-alive only where educationally useful.
- [ ] 697. Model cross-zone/cross-region latency and cost through zones.
- [ ] 698. Define protocol overhead assumptions for HTTP, gRPC, WebSocket, TCP, MQTT, pub/sub, and UDP.
- [ ] 699. Ensure protocol choice does not imply guarantees the model does not implement.

## Add resilience and dependency modeling — P3

- [ ] 700. Model timeouts and bounded retries with exponential backoff and jitter.
- [ ] 701. Model circuit breakers and half-open recovery.
- [ ] 702. Model bulkheads and concurrency isolation.
- [ ] 703. Model quorum and replica failure for supported databases.
- [ ] 704. Model regional or zone failures using actual zone membership.
- [ ] 705. Model cascading failure caused by retry amplification and queue buildup.
- [ ] 706. Add comparative experiments showing mitigation effectiveness.

# Phase 13 — Final Audit and Continuous Improvement

## Perform milestone audits — P1

- [ ] 707. Re-run the complete baseline after Phase 1.
- [ ] 708. Re-score after core simulation correctness reaches its acceptance criteria.
- [ ] 709. Re-run the complete baseline after persistence and validation work.
- [ ] 710. Re-run the complete baseline after testing/CI work.
- [ ] 711. Re-run desktop, tablet, mobile, keyboard, and screen-reader audits after accessibility work.
- [ ] 712. Re-run bundle, CPU, memory, and endurance benchmarks after performance work.
- [ ] 713. Re-run dependency, input-validation, and browser-security audits before releases.
- [ ] 714. Re-run citation validation on a schedule.
- [ ] 715. Record score changes and remaining deductions after every milestone.

## Conduct the final independent review — P1

- [ ] 716. Freeze the scoring rubric before the final review.
- [ ] 717. Ask a reviewer unfamiliar with the implementation to perform core workflows.
- [ ] 718. Ask a distributed-systems reviewer to evaluate model assumptions and results.
- [ ] 719. Ask an accessibility reviewer or qualified tester to evaluate WCAG conformance.
- [ ] 720. Review dependency and deployment security.
- [ ] 721. Review licensing and citation accuracy.
- [ ] 722. Resolve all high- and medium-severity findings or document accepted risk explicitly.
- [ ] 723. Publish a dated quality report with evidence for every rubric point.

## Keep quality tending toward 100 — Ongoing

- [ ] 724. Triage regressions before adding unrelated features.
- [ ] 725. Add a regression test for every escaped defect.
- [ ] 726. Review product claims whenever behavior changes.
- [ ] 727. Review performance budgets whenever dependencies or scenario data grow.
- [ ] 728. Review accessibility whenever interaction patterns change.
- [ ] 729. Review persisted-schema compatibility before every state-model change.
- [ ] 730. Review dependencies and security advisories regularly.
- [ ] 731. Review citation health regularly.
- [ ] 732. Archive completed milestone notes without deleting the evidence behind decisions.
- [ ] 733. Never declare permanent 100/100; report a dated score against the fixed rubric.

# Recommended execution order for short coding windows

## Milestone 1 — Remove immediate trust blockers

- [ ] 734. Resolve the license contradiction.
- [ ] 735. Correct misleading README and UI claims.
- [ ] 736. Add shared runtime schema validation.
- [ ] 737. Fix add-node/add-edge worker synchronization.
- [ ] 738. Fix and test flash-crowd restoration.
- [ ] 739. Replace dead citations.

## Milestone 2 — Correct routing and cache behavior

- [ ] 740. Define edge semantics.
- [ ] 741. Implement cache hit/miss/fallback routing.
- [ ] 742. Replace mislabeled generic fanout behavior.
- [ ] 743. Add deterministic routing and caching tests.
- [ ] 744. Validate the starter architecture end-to-end.

## Milestone 3 — Correct metrics and chaos behavior

- [ ] 745. Separate offered, accepted, completed, and failed load.
- [ ] 746. Correct active-request tracking and percentile calculations.
- [ ] 747. Implement health-state effects.
- [ ] 748. Make every chaos drill produce and restore its advertised effect.
- [ ] 749. Add worker and browser regression tests.

## Milestone 4 — Upgrade test and CI enforcement

- [ ] 750. Add linting, formatting, standalone typecheck, coverage, and production-preview tests.
- [ ] 751. Expand critical Playwright workflows.
- [ ] 752. Add accessibility checks.
- [ ] 753. Enforce checks before deployment.

## Milestone 5 — Responsive and accessible experience

- [ ] 754. Implement compact and mobile layouts.
- [ ] 755. Correct modal, keyboard, tab, form, and live-region semantics.
- [ ] 756. Verify all acceptance viewports and core assistive-technology workflows.

## Milestone 6 — Performance and maintainability

- [ ] 757. Code-split scenario, chart, modal, and export features.
- [ ] 758. Optimize engine indexing and metric aggregation.
- [ ] 759. Decompose store and oversized modules.
- [ ] 760. Establish and enforce performance budgets.

## Milestone 7 — Deep component modeling

- [ ] 761. Implement component models in dependency order: routing, cache, queues/workers, databases, gateways/security, storage/search, and network.
- [ ] 762. Validate each model before exposing it as quantitative behavior.
- [ ] 763. Update scenarios to exercise verified models.

## Milestone 8 — Final qualification

- [ ] 764. Complete documentation and governance files.
- [ ] 765. Run the full audit matrix.
- [ ] 766. Obtain independent system-model and accessibility reviews.
- [ ] 767. Resolve all remaining material findings.
- [ ] 768. Publish the dated score and evidence.

# Standard verification commands

Run these commands after relevant changes. Expand this list as new tooling is added.

```bash
npm ci
npm test
npm run build
npm run test:e2e
npm audit
```

Future expected commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run test:integration
npm run test:accessibility
npm run test:performance
npm run check:bundle
npm run check:citations
```

# Per-task completion template

Copy this block beneath a task when its implementation requires non-trivial evidence:

```markdown
Implementation:
- Commit/PR:
- Files changed:
- Design decision:

Verification:
- [ ] Focused unit/integration tests pass.
- [ ] Full unit test suite passes.
- [ ] Production build passes.
- [ ] Relevant browser tests pass.
- [ ] Accessibility checked where UI changed.
- [ ] Performance checked where hot paths or bundle loading changed.
- [ ] Documentation and product claims updated.
- [ ] No unrelated working-tree changes introduced.

Evidence/notes:
-
```
