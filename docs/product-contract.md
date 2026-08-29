# SysSim Product Contract

**Contract version:** 1.0
**Last reviewed:** August 27, 2026

This document defines what SysSim is, what its outputs mean, and the operating envelope supported by the current application. It is a product contract, not a promise that the current simulation predicts production systems.

## Product identity

SysSim is an **education-first system-design architecture playground with an illustrative simulator**. Its primary purpose is to help learners, interview candidates, instructors, and software practitioners:

- construct and discuss system architectures visually;
- compare architectural patterns and identify design questions;
- experiment with simplified traffic, latency, failure, caching, queueing, and capacity concepts;
- practice system-design scenarios and communicate tradeoffs;
- develop intuition before performing workload-specific engineering analysis.

SysSim is not a production capacity planner, cloud billing calculator, load-testing tool, reliability certification system, or substitute for measurements from a deployed system. Its numerical output must not be used by itself to make purchasing, scaling, availability, security, or safety-critical decisions.

## Output classifications

Every numerical or analytical surface belongs to one of these classifications:

| Classification | Meaning | Current examples |
| --- | --- | --- |
| **Exact calculation** | Deterministic arithmetic from the supplied inputs and documented formulas. The arithmetic is exact within normal JavaScript floating-point and rounding behavior, but the result is only as realistic as its assumptions. | Storage, bandwidth, and instance calculations in the capacity calculator. |
| **Simulated output** | A value produced by SysSim's synthetic request engine. It describes the configured model, not observed production traffic. The same supported graph, configuration, and seed are reproducible. | Request counts, synthetic traces, latency percentiles, error rate, queue depth, and component telemetry. |
| **Heuristic guidance** | A rules-based signal intended to prompt design discussion. It is not proof that an architecture is healthy, unhealthy, scalable, or resilient. | Bottleneck findings, suggested remedies, and the five-pillar health score. |
| **Illustrative estimate** | A directional estimate based on simplified assumptions or static example rates. It is not a quote, forecast, benchmark, or service-level commitment. | Cloud cost estimates and capacity recommendations. |

The UI must identify simulated, heuristic, and estimated output visibly. “Exact calculation” describes formula execution, not real-world accuracy.

## Intended audience

### Primary audience

- System-design interview candidates practicing architecture communication.
- Students learning distributed-systems concepts.
- Instructors demonstrating high-level system behavior.
- Software engineers exploring architecture options before detailed design.

### Secondary audience

- Architects preparing discussion diagrams or workshops.
- Engineering teams using the canvas as a lightweight communication aid.

### Not an intended decision authority

SysSim is not intended to independently approve production designs, calculate contractual SLAs, select infrastructure purchases, prove regulatory compliance, or validate security controls.

## Supported environment

The following is the explicitly supported and verified environment for the current version:

| Surface | Support level |
| --- | --- |
| Browser | Current Chromium-based desktop browsers, verified in Playwright Chromium. |
| Input | Keyboard and mouse/trackpad. |
| Viewport | Desktop layouts at 1280 × 720 CSS pixels or larger. |
| Runtime for development/build | Node.js 20.x, matching continuous integration. |
| Package installation | npm with the committed lockfile; `npm ci` is preferred for reproducible installs. |

Firefox, Safari/WebKit, touch input, tablet layouts, mobile layouts, screen readers, and viewports below 1280 × 720 are currently **best effort and not yet qualified as supported**. Expanding that support requires the responsive, cross-browser, and accessibility checklist work.

## Current supported operating envelope

These conservative limits define the current supported working envelope. They are documented limits, not yet consistently enforced by runtime validation.

| Dimension | Current supported limit |
| --- | ---: |
| Nodes | 100 per architecture |
| Edges | 250 per architecture |
| Zones | 25 per architecture |
| Configured base traffic | 1–50,000 logical requests per simulated second |
| Continuous simulation run | 60 minutes before reset/restart is recommended |
| Imported architecture JSON | 2 MiB |
| Locally saved snapshot | 2 MiB serialized per slot |
| URL-shared compressed state | 16 KiB; use JSON export for larger designs |

Behavior beyond these limits is unsupported until enforcement, stress tests, and performance budgets are implemented. These limits do not imply that every graph within the envelope will maintain a specific frame rate on every machine.

## What the simulation represents

The current engine represents **synthetic logical requests** moving through a directed component graph. Global traffic configuration controls offered logical-request rate. A request records visited components, simplified hop latency, and a final status.

In the current model:

- requests are processed synchronously within each simulation step rather than by a complete real-world distributed scheduler;
- recently completed requests are retained for visualization and trace inspection;
- queue and messaging components are simplified hops within the logical request path;
- operation mixes, payload distributions, retry lifetimes, and independently scheduled background jobs are not yet fully represented;
- the model is suitable for conceptual experiments, not production prediction.

## Request and hop terminology

### Request outcomes

| Status | Contract meaning |
| --- | --- |
| `in_flight` | The request has been created but has not yet received a final outcome. The current UI may also retain recently completed requests for animation; this distinction is scheduled for correction. |
| `success` | The modeled request reached the end of its selected route without a modeled rejection or failure. It does not guarantee that all possible branches or dependencies succeeded. |
| `rate_limited` | A modeled rate limiter rejected the request. |
| `timeout` | The request exceeded a modeled timeout. Timeout behavior is not yet implemented comprehensively for all components. |
| `error` | A modeled component failure, unhealthy component, missing upstream, or similar processing error terminated the request. |
| `dropped` | The model discarded the request or message, currently most commonly because a modeled queue could not accept it. |

### Hop outcomes

| Status | Contract meaning |
| --- | --- |
| `processed` | The component accepted and processed the modeled hop. |
| `hit` | A cache model classified the access as a hit; that cache-aside branch terminates without origin work. |
| `miss` | A cache model classified the access as a miss; an explicit fallback edge can perform origin work and schedule a cache fill after its modeled latency. |
| `rejected` | A policy component rejected the request, such as a rate limiter. |
| `queued` | A messaging component accepted the producer message and returned its configured acknowledgement. Consumer work runs independently on later simulation steps; enqueue success does not prove consumer completion. |
| `error` | Processing at the component failed. |

“Passed” in compact controls means requests whose final modeled status is `success`. “Failed” combines modeled non-success terminal outcomes unless a panel explicitly breaks them down.

## Replica semantics

A `replicas` value inside a component configuration represents **virtual capacity or redundancy within that single canvas node**. It does not create independently addressable graph nodes.

Separately drawn duplicate nodes represent independently routable components. A load balancer can select between those graph nodes.

The current engine does not model all replica behaviors consistently. In particular, a configured replica count may influence capacity or latency heuristics without providing a fully modeled failover target. The UI and documentation must not claim automatic replica failover unless the relevant model implements and tests it.

## Edge semantics

An edge is a **directed typed relationship** from its source node to its target node. Its explicit purpose is one of `request`, `fallback`, `async`, `fanout`, `replication`, or `observability`. It also carries a displayed protocol plus optional latency, bandwidth, and cut-state metadata.

The stored purpose is authoritative. The editor infers an initial purpose for newly drawn edges from endpoints and protocol; version-1 edges without a purpose are migrated once when loaded. Invalid purpose/component combinations are rejected. Load balancing applies only to request edges leaving a load balancer. Generic multi-request dependencies are awaited rather than silently load-balanced.

Detailed execution, latency, status, fallback, branch aggregation, persistence, and 64-hop cycle rules are defined in [Edge Semantics](edge-semantics.md). Cut edges are excluded.

## Interpreting results responsibly

- Compare relative behavior inside the same documented model more readily than absolute production values.
- Treat health scores and bottleneck findings as conversation prompts.
- Treat capacity and cost output as a starting worksheet whose assumptions must be replaced with workload-specific evidence.
- Validate real systems with production telemetry, provider pricing, load tests, failure exercises, and domain expertise.
- Record the SysSim version and configuration when sharing results because model behavior can change between releases.

## Deliberate simplifications and rationale

SysSim deliberately favors an understandable, responsive teaching model over production fidelity. The following simplifications are part of the current contract, not hidden implementation details.

| Area | Current simplification | Why it is simplified | Interpretation and planned follow-up |
| --- | --- | --- | --- |
| Time and scheduling | Requests advance in simulation steps; requests within a step receive deterministic arrival offsets, messaging drains by elapsed time, and app servers use replica-slot service schedules rather than a complete distributed event queue. | Keeps interaction responsive and makes the model approachable. | Do not infer production-grade scheduling. Event scheduling and deeper capacity semantics are tracked in tasks 81–92 and 180–188. |
| Randomness | The engine uses a seeded Mulberry32 pseudo-random stream for request keys and modeled faults. | It is deterministic and portable, not cryptographically random. | Record the seed for comparison; advanced seed lifecycle controls remain tasks 173–178. |
| Edge routing | Explicit purposes distinguish request, fallback, async, fanout, replication, and observability, with validation, visual editing, migration, deterministic tests, and cycle failure. | Branch traces remain flat rather than structured spans, and detached work executes in the current step. | Use [Edge Semantics](edge-semantics.md) as the current contract. |
| Cache behavior | Stable request keys, uniform/Zipfian/custom distributions, cache-aside termination/fallback/delayed population, TTL, capacity, eviction, cache-type scope, outage bypass, cold-key stampedes, optional request coalescing, and reconciled cache counters are modeled. | The seeded cache-hit target is an illustrative lookup control, not a prediction derived from real object popularity, invalidation, or telemetry. Coalescing uses a simplified in-flight fill rather than a full distributed locking protocol. | Use [Cache Semantics](cache-semantics.md). Cache correctness tasks 41–60 are complete. |
| Messaging | Message queues, task queues, pub/sub, and event buses create distinct logical delivery copies. Producer acknowledgement, consumer outcomes, retries, queue age, drops, expiry, DLQ, retention, overflow, drain capacity, groups/fanout, guarantees, and ordering are modeled separately. | Membership/rebalancing, offset commits, broker persistence, storage compaction, and transactional exactly-once processing are not modeled. | Use [Messaging Semantics](messaging-semantics.md). Tasks 61–75 are complete. |
| Compute, edge networking, and SQL reads | Global QPS is apportioned by client weights. Compute nodes model capacity, queueing, failure, and serverless lifecycle semantics. Load balancers, gateways, CDNs, DNS, WAFs, and reverse proxies apply their documented routing, caching, admission, latency, rejection, compression, and buffering assumptions with component-specific telemetry. SQL workload operations come from client configuration; eligible reads use virtual replicas and writes remain primary-bound. | Constants and formulas are explicit teaching assumptions rather than infrastructure benchmarks. CDN and DNS geography use deterministic proxies, WAF rule cost is linear and illustrative, reverse-proxy compression is a fixed ratio, cache-rule text is diagram-only, and SQL replicas are virtual capacity rather than graph nodes. | Use [Compute and Networking Component Semantics](component-semantics.md). Tasks 76–120 are complete. |
| Replicas and failover | A configured replica count is virtual capacity/redundancy inside one node and does not create independently routable instances or automatic failover. Load-balancer targets do use interval checks and delayed recovery. | Database role promotion and orchestrated replica failover are not modeled. | Draw separate nodes when independent routing matters. Remaining database failover work is tracked in tasks 120–124. |
| Health states | Manual and chaos states use simplified health labels; not every state consistently changes capacity, latency, or errors. | A unified health-state model has not yet been implemented. | A healthy label is not proof of availability. Health semantics are tracked in tasks 152–159. |
| Chaos drills | Drills mutate selected graph/configuration state but do not reproduce complete infrastructure failure and recovery mechanisms. | Production chaos behavior depends on orchestration, routing, persistence, and recovery models outside the current engine. | Treat drills as visual experiments. Drill correctness is tracked in tasks 160–172. |
| Latency and percentiles | Hop latency is simplified and aggregated from synthetic samples. | Network distributions, queue wait, service time, geography, and coordinated omission need separate models. | Percentiles describe only the current synthetic run. Latency/metrics work is tracked in tasks 180–199. |
| Health and bottleneck analysis | Scores and findings are fixed rules over graph structure and simulated telemetry. | They are teaching prompts, not an externally validated architecture assessment. | Validate conclusions independently. Evidence-based analysis is tracked in tasks 271–284. |
| Capacity worksheet | Formulas are deterministic but assume simplified traffic, payload, replication, and per-server capacity. | A general worksheet cannot know a workload's headroom, indexes, compression, growth, failover reserve, or utilization target. | Replace assumptions with measured inputs. Calculator work is tracked in tasks 285–297. |
| Cloud cost | Prices are static illustrative example rates and omit many provider, region, usage, discount, and managed-service dimensions. | Live pricing and provider-specific billing are outside the current implementation. | Never treat the total as a quote or forecast. Cost transparency is tracked in tasks 298–307. |
| Scale limits | The documented operating envelope is not yet enforced consistently at every input boundary. | Validation, persistence quotas, and stress budgets are scheduled separately. | Behavior beyond the envelope is unsupported. Enforcement is tracked across validation and performance tasks 214–249 and 473–497. |

## Contract maintenance

Any change to simulation meaning, supported limits, status definitions, replica behavior, edge behavior, or output classification must update this document in the same change. Product copy and tests must remain consistent with the contract.
