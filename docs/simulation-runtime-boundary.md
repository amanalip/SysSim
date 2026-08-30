# Simulation runtime boundary

The simulation runtime has one directional dependency flow:

`React UI → Zustand actions/runtime commands → SimulationBridge → worker or fallback engine → injected events → Zustand state`

Engine modules do not import React, Zustand, the DOM, or localStorage. The application composition module, `simulation-runtime.ts`, is the only adapter that reads and updates the UI store. Graph mutations notify a minimal command bus, and the runtime translates those notifications into graph synchronization commands.

## Lifecycle

- `App` initializes the runtime after mounting and disposes it during teardown or hot replacement.
- Importing `sim-bridge.ts` or `simulation-runtime.ts` does not create a Worker.
- Each `SimulationBridge` instance owns its Worker, fallback engine, timer, graph acknowledgement, and pending-start state. Tests can construct isolated instances with injected factories and clocks.
- A Worker sends `WORKER_READY`; the bridge then sends graph, configuration, and speed. `START` is withheld until `GRAPH_ACK` matches the current graph revision.
- Commands and responses are discriminated unions and are checked at runtime. Invalid or stale tick responses are ignored.

## Recovery

Worker construction or runtime failure activates the independently testable main-thread engine. Existing UI metrics and elapsed results remain displayed until the fallback publishes a new tick; recovery does not issue a reset event. Repeated start, resume, pause, errors, and disposal clear the existing timer before installing another one. Diagnostics call this non-alarming “compatibility mode” in the control tooltip.

Position-only canvas changes are intentionally not synchronized because routing and simulation semantics do not use display coordinates. Semantic graph changes increment the graph revision and synchronize exactly once.
