# Architecture Overview

SysSim is a static React application with a deterministic simulation engine. The dependency direction is deliberately one-way:

```text
components → store/selectors → simulation command boundary → worker bridge → engine
     ↓             ↓                       ↓                      ↓
  model UI      persistence            protocol              pure models
```

UI components may read model types and selectors. They must not import engine internals. The store owns editable application state and commands, while the engine owns transient simulation state. The worker protocol carries clone-safe commands and snapshots; neither side shares mutable objects. Pure model, analysis, security, platform, and utility modules do not depend on React.

## State ownership

| State                               | Owner                         | Persistence                              | Consumers                      |
| ----------------------------------- | ----------------------------- | ---------------------------------------- | ------------------------------ |
| Canvas nodes, edges, zones, history | Zustand canvas slice          | Architecture JSON, share hash, snapshots | Canvas, properties, scenarios  |
| Traffic configuration               | Zustand simulation slice      | Architecture JSON and snapshots          | Controls and simulation bridge |
| Simulation lifecycle and metrics    | Engine; mirrored into Zustand | Not restored as a running process        | Controls, metrics, traces      |
| Theme and motion preference         | Zustand preference slice      | Browser localStorage                     | All rendered UI                |
| Scenario progress                   | Scenario progress module      | Browser localStorage                     | Scenario manager               |

The current store remains exposed through `useStore`, but state domains and mutation listeners are documented in [store architecture](store-architecture.md). Cross-domain synchronization must go through the command bus rather than importing the worker into the store.

## Main-thread/worker flow

```text
User edit → Zustand mutation → graph revision → INIT_OR_UPDATE_GRAPH
                                                   ↓
UI metrics ← validated TICK payload ← worker event loop/engine step
```

The bridge waits for `GRAPH_ACK` before starting a requested run, rejects stale tick revisions, and falls back to a bounded main-thread engine if worker startup fails. Reset, traffic, speed, graph, pause, and resume are explicit protocol messages. See [simulation runtime boundary](simulation-runtime-boundary.md).

## Simulation model

A request is an entity with a seeded identity, arrival time, route, hop records, terminal status, and latency breakdown. A priority queue orders arrival, completion, timeout, retry, and component events by simulation time and a stable sequence. Routing uses typed edge purposes and component-specific policies. Wall-clock time is used only for diagnostics and user-facing timestamps; simulation behavior advances only with the simulation clock.

Detailed contracts live in [simulation clock](simulation-clock.md), [edge semantics](edge-semantics.md), [component semantics](component-semantics.md), [messaging semantics](messaging-semantics.md), and [metrics semantics](metrics-semantics.md).

## Persistence and compatibility

Architecture documents are strict, versioned JSON. Data flows through size limits, prototype-safety checks, migrations, strict key validation, semantic graph validation, and only then conversion to React Flow presentation types. Snapshot slots use the same canonical architecture representation. See [persistence](persistence.md) and [architecture schema](architecture-schema.md).

## Decisions

Major tradeoffs are recorded in [`docs/decisions`](decisions/): deterministic illustrative modeling, Web Worker isolation with safe fallback, strict canonical persistence, and static GitHub Pages deployment. Diagrams are used only for dependency and event-flow relationships that are harder to audit as prose.
