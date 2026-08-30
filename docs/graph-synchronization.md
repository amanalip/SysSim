# Graph synchronization contract

The Zustand store is authoritative for graph topology and simulation-relevant component configuration. Every semantic graph mutation increments `graphRevision` and performs one bridge synchronization after the complete state update.

Semantic changes include node or edge addition/removal, component configuration and health changes, edge protocol/purpose/cut changes, undo/redo, and graph loads. Multi-item operations use one store update and therefore one revision and one synchronization.

Node position, selection, viewport, zone, and auto-layout changes are presentation-only. They do not affect routing or component behavior, do not increment `graphRevision`, and are intentionally not sent to the simulation worker.

React Flow removal events are routed through `removeGraphItems`, which snapshots history once, removes selected nodes and their incident edges atomically, increments the revision once, and synchronizes once. Other React Flow node changes remain visual-only.

Every graph-update message sent to the worker contains `{ graph, graphRevision }`. Every tick result carries the revision of the graph that produced it. The bridge applies a tick only when its revision exactly matches the store's current revision; older results are ignored.

## Current coupling inventory

The store imports the singleton `simBridge` and invokes it from semantic mutation actions. The bridge imports `useStore` to read graph/configuration state and publish simulation results. The bridge singleton also initializes its worker or fallback engine at module import time. These two imports form the current circular store/bridge dependency and mix graph state, command dispatch, lifecycle initialization, and result publication. Tasks 216–219 will replace this with a one-way injected command/event boundary; this batch documents the boundary without expanding that later refactor's scope.
