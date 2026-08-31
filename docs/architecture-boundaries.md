# Architecture boundaries

SysSim uses one-way dependencies so that the deterministic simulator stays testable outside React.

1. `model/` owns serializable domain types, defaults, validation, and migrations. It does not import UI or store code.
2. `engine/` owns clocks, routing, component execution, event scheduling, and metrics. Pure engine modules may import `model/`, but never React components or Zustand.
3. `store/` owns application state and undo history. It adapts domain and engine results for the UI.
4. `components/` renders state and sends user intent to store actions. It must not be imported by lower layers.
5. `engine/simulation-runtime.ts` and `engine/sim-bridge.ts` are explicit boundary adapters. They may connect the worker/engine to the store; pure engine modules may not import them.
6. `scenarios/` contains immutable scenario data. `scenarios/registry.ts` owns lightweight metadata and lazy category loaders so opening the main canvas does not download the full catalog.

ESLint enforces the most dangerous engine-to-UI/store inversions. The architecture contract test checks the model and pure-engine trees, including future files. File length is not a quality target: split a file when it has multiple reasons to change, and keep cohesive implementations together when splitting would hide invariants.

Zones are diagram annotations, not semantic containers. Moving or deleting a zone therefore never moves or deletes nodes inside its rectangle. Auto-layout can move nodes independently without changing simulation behavior. Grid snapping and auto-layout cover the common alignment workflow; separate alignment/distribution commands are deferred until usability evidence shows they would materially improve construction.

Connections use explicit source-to-target arrows. Invalid source/target or purpose combinations are rejected; valid but unusual combinations are accepted with an immediate explanation so SysSim remains useful as an educational playground.
