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

---

## 2. Desktop UX/UI Enhancements

1. **Edge Cut / Repair Toggle**: Direct interactive cut status and repair button on protocol edge badges.
2. **Synchronized Slider & Number Inputs**: Properties panel provides both range sliders and direct numeric input boxes for all parameters.
3. **Inbound & Outbound Bandwidth Cards**: Capacity calculator displays separate cards for Inbound and Outbound Mbps with formulas.
4. **Desktop Hotkey Badges**: Visual keyboard shortcut hints (`Space`, `L`, `C`, `M`, `?`, `Ctrl+D`, `1`, `2`, `3`) across buttons and menus.
5. **Context Menu Clamping**: Context menu stays fully inside viewport regardless of click position.
6. **Per-Component Metrics Table Empty State**: Clear guidance message when viewing table before starting simulation.
7. **Pulsing Chaos Mode Indicator**: Control bar displays pulsing active indicator when Chaos Monkey is running.
8. **Toast Notifications with Status Badges**: Clean success, warning, and error toasts with dismiss actions.
9. **Clone Configuration on Duplicate**: Preserves exact replica counts, connection pool sizes, and cache policies when duplicating nodes.
10. **High-Contrast Focus States**: Clean WCAG focus rings for desktop keyboard navigation.
11. **Palette Search Quick-Clear & Escape**: Added `X` button and `Escape` key shortcut to clear component palette filter.
12. **Live Dynamic Category & Difficulty Counts**: Scenario dropdowns reflect real-time match counts as users filter by category and difficulty.
13. **Inline Editable Zone Labels**: Double-click any zone header on canvas to rename it directly.
14. **Topology Overview Counter Badge**: Header bar displays live total component and link counts for quick diagram orientation.
15. **Smooth Topological Layout Animation**: Auto-layout triggers smooth animated centering with 20% aesthetic padding.
16. **Bottleneck Badge Inspection Tooltips**: Warning badges on canvas nodes indicate specific bottleneck descriptions.
17. **Fractional Availability SLA Precision**: Telemetry displays 2-decimal SLA compliance.
18. **Instant Reference Architecture Loading**: Smooth scenario loading with automated reset.
19. **Direct Rated Capacity Tuning**: Configurable Max Capacity (QPS) in Properties Panel.
20. **Universal Escape Key Dismissal**: `Escape` key reliably dismisses properties panels, modals, dropdowns, context menus, and search bars.
21. **Smooth Backspace/Numeric QPS Input**: QPS input allows fluent backspace editing without value jumping.
22. **Scenario Progress Feedback Toasts**: Toast confirmation on solving and unlocking hints.
23. **Estimated DB Pool Output Card**: Capacity calculator displays connection pool estimates with focus navigation.
24. **Utilization & Active Connection Table Columns**: Per-component breakdown includes real-time utilization and active concurrency with alert coloring.
25. **Keyboard Sidebar Tab Switching**: Hotkeys `1`, `2`, and `3` rapidly switch between Palette, Scenarios, and Calculator tabs.
26. **Bottleneck Inspect Node Feedback**: Inspecting detected bottlenecks triggers an informative toast and focuses the properties inspector.

---

## 3. Test Suites & Quality Improvements

- **22 test files**, **133 total unit and integration tests** passing:
  - Non-LB multi-edge round-robin routing
  - 502 Bad Gateway handling on empty LB targets
  - RateLimiterConfig `limitQps` subtext rendering
  - RateLimiterModel simulated time start at 0 and refill calculations
  - RateLimiterModel reset restoring token bucket
  - Node duplication custom property cloning
  - ContextMenu coordinate clamping and Escape dismissal
  - EnvelopeCalculator zero-division, Inbound/Outbound bandwidth, and DB pool estimation
  - Chaos Monkey fault injection and clean restoration
  - Edge cut/repair simulation step handling
  - URL sharing state serialization with edge cut preservation
  - Topological auto-layout cycle protection
  - Bottleneck detector recognizing `browser_cache`, `pubsub`, and `event_bus`
  - LoadBalancerRouter weighted fallback
  - ConsistentHashRing binary search lookup
  - Rate-based component utilization calculation
  - Real-time active connection tracking
  - QueueModel and DatabaseModel reset verification
  - SysSimEngine comprehensive model reset
  - Inline zone label updates
  - PropertiesPanel max throughput and health updates
  - ProtocolEdge transport switching and partition toggling
  - SimulationControls traffic pattern and QPS updates
  - Zone creation and deletion lifecycle
  - Redo and undo history stack verification
  - SimulationBridge worker and fallback lifecycle management
  - Toast notification lifecycle and queue management
  - 101 Scenario registration, difficulty segmentation, and filtering
  - Bottleneck detector SPOF, queue backpressure, DB concurrency, and sync-chain rules
