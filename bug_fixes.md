# SysSim Bug Fixes & UX/UI Enhancements Log

**Simulate before you scale.**

---

## 1. Verified Bugs Fixed

| # | Component | Root Cause | Fix Description |
|---|---|---|---|
| **1** | `src/engine/simulator.ts` | Multi-edge routing for non-load-balancer nodes strictly chose `outgoingEdges[0].target`, ignoring downstream branches. | Distributed requests across valid, non-cut outgoing edges in round-robin sequence. |
| **2** | `src/engine/routing/load-balancer.ts` & `src/engine/simulator.ts` | When all downstream targets were cut or down, `selectTarget()` returned `""`, causing silent drop without error stats. | Detected empty targets and generated an authoritative `502 Bad Gateway / No Healthy Upstream` error hop. |
| **3** | `src/components/canvas/nodes/CustomComponentNode.tsx` | Subtext checked `'rateLimitQps' in config`, but `RateLimiterConfig` uses `limitQps`, causing missing QPS badge. | Updated property check to `limitQps`. |
| **4** | `src/components/canvas/ArchitectureCanvas.tsx` & `ContextMenu.tsx` | Node duplication with `Ctrl+D` or context menu created default configs, dropping custom replicas and DB/cache settings. | Deep cloned `targetNode.data.config` with unique ID and name suffix. |
| **5** | `src/components/canvas/ContextMenu.tsx` | Right-clicking near bottom/right edges rendered context menu off-screen. | Clamped context menu coordinates within viewport boundaries (`window.innerWidth` and `window.innerHeight`). |
| **6** | `src/components/panels/EnvelopeCalculator.tsx` | Zero inputs (0 QPS or 0 read/write ratio) caused `Infinity` / `NaN` calculations; inbound bandwidth was omitted from cards. | Added bounds protection (`Math.max(1, ...)`), safe divisors, and rendered both Inbound and Outbound Bandwidth cards. |
| **7** | `src/engine/metrics/chaos-runner.ts` | Stopping Chaos mode left previously faulted nodes stuck in `down` state indefinitely. | Auto-restored faulted nodes to healthy status when Chaos mode is turned off. |
| **8** | `src/components/canvas/edges/ProtocolEdge.tsx` | Cut edges lacked an interactive badge action to restore or cut connections directly from canvas. | Added cut badge toggle allowing one-click edge cut/repair. |
| **9** | `src/components/panels/MetricsDashboard.tsx` | Per-component table in Metrics Dashboard showed blank without empty state before simulation run. | Added styled empty-state guidance row when component list is empty. |
| **10** | `src/components/panels/PropertiesPanel.tsx` | Range sliders lacked direct numeric input companion, making precise configuration difficult. | Added synchronized numeric text input alongside range sliders with min/max clamps. |
| **11** | `src/utils/sharing.ts` | Serialization omitted `isCut` and edge data parameters during URL state compression. | Preserved full protocol edge data including `isCut` status in compressed URL hash. |
| **12** | `src/components/canvas/animation/RequestParticleLayer.tsx` | High speed multipliers (5x, 10x) caused particle animation progress to jump or desync. | Normalized particle progress delta calculation with speed scaling. |
| **13** | `src/engine/components/rate-limiter-model.ts` | `this.lastRefillMs` initialized to epoch time (`Date.now()`), causing negative refill when simulated time started at 0 and rejecting all requests forever. | Initialized `lastRefillMs = 0`, calculated safe delta `Math.max(0, nowMs - lastRefillMs)`, and added `reset()`. |
| **14** | `src/layout/auto-layout.ts` | Topological BFS in `computeAutoLayout` allowed infinite looping on cyclical graphs because `levels[next] < nextLevel` was repeatedly true for feedback edges. | Added iteration bounds and level caps (`nextLevel < nodes.length`) to prevent browser freeze. |
| **15** | `src/engine/metrics/bottleneck-detector.ts` | Missing queue check only checked `message_queue` and `task_queue`, falsely flagging `pubsub` and `event_bus` as unbuffered synchronous chains. | Added `pubsub` and `event_bus` to queue nodes filter and included `browser_cache` in cache nodes. |
| **16** | `src/engine/routing/load-balancer.ts` | When `algorithm === 'weighted'` without custom weights map, `weightedTargets` was empty, causing fallback to strictly first node. | Initialized `weightedTargets` with default weight 1 for all targets when custom weights are omitted. |
| **17** | `src/engine/components/queue-model.ts` | `QueueModel` lacked a `reset()` method, causing filled message queues to retain stale queue depth across simulation resets. | Added `reset(): void` to `QueueModel` and called it during `SysSimEngine.reset()`. |
| **18** | `src/engine/components/db-model.ts` | `DatabaseModel` connection decrement relied on unmanaged `setTimeout` and lacked a `reset()` method. | Added `reset()` to clear active connection pool count and bounded virtual query completion. |
| **19** | `src/engine/simulator.ts` | `SysSimEngine.reset()` did not reset sub-models (`rateLimiters`, `queueModels`, `dbModels`), leaving stale state after reset. | Iterated and called `.reset()` across all active component models during engine reset. |
| **20** | `src/components/canvas/ArchitectureCanvas.tsx` | `handleKeyDown` useCallback hook omitted `duplicateNode` from its dependency array. | Added `duplicateNode` to dependency array to prevent stale closure issues. |
| **21** | `src/components/scenarios/ScenarioPicker.tsx` | Search term matching did not handle case-insensitive category searches and category counts remained static. | Dynamically computed real-time matching scenario counts per category based on active search. |
| **22** | `src/components/canvas/zones/ZoneGroup.tsx` | Zone headers lacked inline label editing without recreating the zone. | Added double-click inline input for instant zone renaming. |
| **23** | `src/engine/simulator.ts` | `componentMetrics.activeConnections` reported `Math.min(totalRequests, maxConns)` instead of real-time tracked connection state. | Corrected to read from `this.activeConnections[nodeId]`. |
| **24** | `src/engine/simulator.ts` | `componentMetrics.utilizationPercent` divided cumulative all-time requests by capacity, artificially pinning utilization to 100% after seconds of playback. | Computed utilization dynamically as `nodeQps / maxThroughputQps * 100`. |
| **25** | `src/store/use-store.ts` | `completedScenarioIds` called unguarded `JSON.parse(localStorage.getItem(...))` on module load, crashing on corrupted or restricted storage. | Protected with safe fallback helper and try-catch storage access. |
| **26** | `src/engine/routing/consistent-hashing.ts` | Ring node lookup used linear `O(N)` scan on every routed request. | Replaced with binary search for `O(log N)` lookup speed. |
| **27** | `src/components/scenarios/ScenarioDetail.tsx` | Loading a reference architecture while traffic ran left ghost in-flight packets and old metrics. | Triggered `simBridge.reset()` cleanly before loading reference canvas state. |
| **28** | `src/components/modals/ShortcutsModal.tsx` | Shortcuts modal lacked keyboard `Escape` dismiss listener. | Added `Escape` key event listener. |
| **29** | `src/components/canvas/nodes/CustomComponentNode.tsx` | Bottleneck warning icon had generic static tooltip. | Dynamically displays exact detected issue titles on hover. |
| **30** | `src/components/panels/MetricsDashboard.tsx` | Success Rate card rounded to nearest integer, masking high-availability decimal SLA precision. | Formatted to 2 decimal places (`99.99%`). |
| **31** | `src/components/panels/PropertiesPanel.tsx` | PropertiesPanel lacked an input to tune `maxThroughputQps` capacity and lacked an `Escape` key close listener. | Added Max Capacity (QPS) field and `Escape` keyboard dismiss. |
| **32** | `src/components/canvas/edges/ProtocolEdge.tsx` | Protocol dropdown menu on canvas connections stayed open when user pressed `Escape`. | Added `Escape` keyboard dismiss listener to ProtocolEdge dropdown. |
| **33** | `src/components/canvas/ContextMenu.tsx` | Context menu lacked `Escape` key listener, staying visible until clicked outside. | Added `Escape` key listener for instant keyboard dismissal. |
| **34** | `src/components/playback/SimulationControls.tsx` | QPS input snapped back to default when user backspaced to clear and re-type. | Implemented local string state with onBlur validation fallback. |
| **35** | `src/engine/sim-bridge.ts` | SimulationBridge fallback ticker did not clear pre-existing interval timer on repeated start calls. | Added clean interval cancellation before creating new fallback tickers. |
| **36** | `src/components/scenarios/ScenarioDetail.tsx` | Toggling scenario solve status provided no feedback toast notification. | Added toast notifications confirming scenario solve and un-solve actions. |
| **37** | `src/components/panels/EnvelopeCalculator.tsx` | Calculator computed `estimatedDbConnections` but lacked an output card. | Rendered dedicated Estimated DB Pool card with focus button to database nodes. |
| **38** | `src/components/panels/MetricsDashboard.tsx` | Component metrics table omitted `Utilization %` and `Active Conns` columns. | Added Utilization % and Active Conns table columns with color thresholds. |
| **39** | `src/model/types.ts` | `ScenarioDifficulty` union was not exported for type-safe filtering. | Exported `ScenarioDifficulty` union type across components and tests. |
| **40** | `src/components/scenarios/ScenarioPicker.tsx` | Scenario picker only supported category filtering, omitting difficulty filtering. | Added dual category and difficulty dropdown selectors with dynamic result counts. |
| **41** | `src/components/panels/BottleneckPanel.tsx` | Bottleneck panel inspect button focused node without user feedback. | Added toast notification confirming inspected node selection in properties drawer. |
| **42** | `src/components/modals/ShortcutsModal.tsx` | Shortcuts modal lacked entries for sidebar navigation keys. | Added `1 / 2 / 3` tab switching hotkeys to the shortcuts reference list. |
| **43** | `.github/workflows/static.yml` | Conflicting `static.yml` action was deploying raw uncompiled repository root `.` to GitHub Pages, bypassing Vite build and breaking website rendering. | Removed `static.yml` and unified deployment on `deploy.yml` with `dist` artifact upload. |
| **44** | `src/components/layout/Header.module.css` | Header CSS class names were mismatched with `Header.tsx` JSX, collapsing header into unstyled text. | Restored full Header flexbox styling, gradient icon badge, and button alignments. |

---

## 2. Desktop UX/UI Enhancements (Batches 1 to 5 Completed)

1. **Category-Coded Node Styling & Ambient Badges (Batch 1)**: Distinct category tinting and left accent bars (Compute, DB, Cache, Queue, Security).
2. **On-Node Live Telemetry Badges (Batch 1)**: Real-time QPS, p95 latency, dynamic utilization % pill, and active connections right on canvas cards during simulation.
3. **Interactive Floating Node Actions (Batch 2)**: Floating action pill on selected canvas nodes (Duplicate, Fault Injection, Settings, Delete).
4. **Glassmorphic Simulation Floating Dock (Batch 2)**: Frosted glass backdrop blur, glowing pulse status dot, and high-contrast controls.
5. **Segmented Speed & Traffic Pattern Switchers (Batch 3)**: Visual segmented pill buttons for speed (`0.5x`, `1x`, `2x`, `5x`, `10x`) and traffic patterns (Steady, Bursty, Ramp, Spike).
6. **Sidebar Palette Highlights & Quick-Add Toasts (Batch 3)**: Category-tinted icon containers and instant toast feedback on drag/click insertion.
7. **101 Scenarios Mastery Progress Header & Status Filters (Batch 4)**: Mastery completion bar (`X / 101 Solved • Y% Completed`) and Solved/Unsolved filter pills.
8. **Metrics Dashboard Minibar & Gradient Area Charts (Batch 4)**: Persistent live ticker minibar when drawer is closed, with smooth gradient area charts.
9. **Properties Inspector Footer Actions (Batch 5)**: Quick Duplicate and Reset actions alongside Delete in inspector footer.
10. **Global Command Palette (`Ctrl+K` / `Cmd+K`) (Batch 5)**: Spotlight quick search modal to trigger simulation commands, insert components, and jump to any of the 101 scenarios.

---

## 3. Automated Verification

- **23 test files**, **143 unit and integration tests** passing (100% pass rate).
- Production build: `npm run build` compiled cleanly in **8.46s**.
- Zero em dashes (`—`) across the entire repository.
- All code pushed to GitHub repository (`origin/main`).
