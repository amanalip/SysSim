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
| **Simulated output** | A value produced by SysSim's synthetic request engine. It describes the configured model, not observed production traffic. Randomized behavior may vary between runs until seeded simulation is implemented. | Request counts, synthetic traces, latency percentiles, error rate, queue depth, and component telemetry. |
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
| `hit` | A cache model classified the access as a hit. Current downstream cache-routing semantics remain simplified. |
| `miss` | A cache model classified the access as a miss. Current origin fallback semantics remain simplified. |
| `rejected` | A policy component rejected the request, such as a rate limiter. |
| `queued` | A queue accepted the modeled message or request. This does not independently prove eventual consumer completion. |
| `error` | Processing at the component failed. |

“Passed” in compact controls means requests whose final modeled status is `success`. “Failed” combines modeled non-success terminal outcomes unless a panel explicitly breaks them down.

## Replica semantics

A `replicas` value inside a component configuration represents **virtual capacity or redundancy within that single canvas node**. It does not create independently addressable graph nodes.

Separately drawn duplicate nodes represent independently routable components. A load balancer can select between those graph nodes.

The current engine does not model all replica behaviors consistently. In particular, a configured replica count may influence capacity or latency heuristics without providing a fully modeled failover target. The UI and documentation must not claim automatic replica failover unless the relevant model implements and tests it.

## Edge semantics

An edge currently means a **directed potential next hop** from its source node to its target node. It carries a displayed protocol plus optional latency, bandwidth, and cut-state metadata.

Current routing behavior is intentionally documented as follows:

- one usable outgoing edge selects that target;
- a load balancer with multiple usable outgoing edges uses its configured routing algorithm;
- another component with multiple usable outgoing edges selects one target using round-robin routing;
- a cut edge is excluded from routing;
- cycles stop when a request encounters a node it has already visited;
- the current model does not yet encode separate request, fallback, fanout, asynchronous, replication, or observability edge purposes;
- drawing parallel dependencies therefore does not yet imply that all dependencies execute.

This is a known limitation, not an architectural recommendation. Explicit edge-purpose semantics are tracked beginning at improvement task 22.

## Interpreting results responsibly

- Compare relative behavior inside the same documented model more readily than absolute production values.
- Treat health scores and bottleneck findings as conversation prompts.
- Treat capacity and cost output as a starting worksheet whose assumptions must be replaced with workload-specific evidence.
- Validate real systems with production telemetry, provider pricing, load tests, failure exercises, and domain expertise.
- Record the SysSim version and configuration when sharing results because model behavior can change between releases.

## Contract maintenance

Any change to simulation meaning, supported limits, status definitions, replica behavior, edge behavior, or output classification must update this document in the same change. Product copy and tests must remain consistent with the contract.
