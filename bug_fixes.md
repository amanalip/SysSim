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

---

## 2. Desktop UX/UI Enhancements

1. **Edge Cut / Repair Toggle**: Added direct interactive cut status and repair button on protocol edge badges.
2. **Synchronized Slider & Number Inputs**: Properties panel now provides both range sliders and direct numeric input boxes for all parameters.
3. **Inbound & Outbound Bandwidth Cards**: Capacity calculator displays separate cards for Inbound and Outbound Mbps with formulas.
4. **Desktop Hotkey Badges**: Added visual keyboard shortcut hints (`Space`, `L`, `C`, `M`, `?`, `Ctrl+D`) across buttons and menus.
5. **Context Menu Clamping**: Context menu stays fully inside viewport regardless of click position.
6. **Per-Component Metrics Table Empty State**: Clear guidance message when viewing table before starting simulation.
7. **Pulsing Chaos Mode Indicator**: Control bar displays pulsing active indicator when Chaos Monkey is running.
8. **Toast Notifications with Status Badges**: Clean success, warning, and error toasts with dismiss actions.
9. **Clone Configuration on Duplicate**: Preserves exact replica counts, connection pool sizes, and cache policies when duplicating nodes.
10. **High-Contrast Focus States**: Clean WCAG focus rings for desktop keyboard navigation.

---

## 3. Test Suites & Quality Improvements

- Added 12 new automated test cases covering:
  - Non-LB multi-edge round-robin routing
  - 502 Bad Gateway handling on empty LB targets
  - RateLimiterConfig `limitQps` rendering
  - Node duplication custom property cloning
  - ContextMenu coordinate clamping
  - EnvelopeCalculator zero-division and Inbound/Outbound bandwidth calculations
  - Chaos Monkey fault injection and clean restoration
  - Edge cut/repair simulation step handling
  - URL sharing state serialization with edge cut preservation
  - High-speed simulation step stability
