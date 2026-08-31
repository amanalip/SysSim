# SysSim

**Explore architecture tradeoffs before you scale.**

SysSim is an education-first system-design architecture playground with an illustrative traffic simulator. Build architectures on a visual canvas, explore simplified failure states, inspect rules-based design prompts, and practice 101 system-design scenarios with progressive hints and source citations.

SysSim's synthetic results are designed to build intuition. They are not production forecasts, cloud-provider quotes, load-test results, reliability certification, or proof that a design meets an SLA. Read the [product contract](docs/product-contract.md) for output definitions, assumptions, supported limits, and known simplifications.

---

## Features

- **Interactive Canvas**: Drag-and-drop 27 component types across Compute, Networking, Storage, Caching, Messaging, and Security categories.
- **Illustrative Traffic Simulation**: A step-based synthetic request model running in a background Web Worker. It generates modeled request paths, simplified hop latencies, and illustrative p50/p95/p99 telemetry.
- **Traffic Patterns**: Simulate Steady, Bursty, Ramp-up, and Spike traffic profiles with customizable base QPS.
- **Typed Edge Semantics**: Model synchronous requests, conditional fallback, parallel fanout, asynchronous acknowledgement, replication, and observability relationships with documented aggregation rules.
- **Failure Exploration & Chaos Mode**: Mark components down, cut connections, and apply simplified fault states. Not every real-world recovery or failover path is modeled.
- **Heuristic Design Review**: Rules-based prompts identify possible single points of failure, missing cache tiers, and modeled capacity pressure.
- **Capacity Worksheet**: Deterministic back-of-envelope formulas estimate storage growth, replication multipliers, bandwidth, server count, and cache size from simplified assumptions.
- **101 System Design Scenarios**: Factchecked scenario library spanning 15 categories with constraints, progressive hints, reference architectures, interview discussion questions, and verified source citations.
- **Sharing & Export**: Compress bounded architecture state into URL hashes, export PNG diagrams, and save/load JSON architecture data.

---

## Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **Canvas**: @xyflow/react (React Flow)
- **State Management**: Zustand
- **Charts & Telemetry**: Recharts
- **Icons & Visuals**: Lucide React
- **Testing**: Vitest, Playwright

---

## Getting Started

### Two-minute workflow demo

1. Drag a client, gateway, application server, and database onto the canvas.
2. Draw arrows from source to target and choose each connection's purpose (request, fallback, async, fanout, replication, or observability).
3. Set a deterministic seed and offered QPS, run the synthetic model, then inspect completed throughput, drops, rolling latency percentiles, and hop-by-hop traces.
4. Stop to receive a run summary. Compare a scenario reference, undo changes, save a snapshot, or export the architecture as versioned JSON/PNG.

This is an interactive learning loop, not a load test: component capacity, latency, failures, and costs are simplified models. See the [product contract](docs/product-contract.md) for exact terms and limitations.

### Prerequisites

Node.js `>=20 <23` and npm `>=10` are the supported development and build ranges. CI uses Node 20. Use the committed lockfile rather than regenerating dependency versions casually.

### Installation

```bash
# Clone repository
git clone https://github.com/amanalip/SysSim.git
cd SysSim

# Install dependencies
npm ci

# Start development server
npm run dev
```

Use `npm ci` for clean, reproducible installs in CI and fresh checkouts. Use `npm install` only when intentionally changing dependencies and commit the resulting lockfile update.

Visit `http://localhost:5173/SysSim/` in a current Chromium-based desktop browser. The currently supported viewport is 1280 × 720 CSS pixels or larger with keyboard and mouse/trackpad input. Other browsers, touch input, and smaller layouts are currently best effort; see the [supported environment](docs/product-contract.md#supported-environment).

---

## Development Scripts

```bash
# Run unit test suites
npm run test

# Run type checks and compile production build
npm run build

# Preview production build locally
npm run preview
```

---

## Keyboard Shortcuts

| Key                    | Action                                |
| ---------------------- | ------------------------------------- |
| `Space`                | Start / Pause simulation              |
| `Ctrl + Z` / `Cmd + Z` | Undo canvas action                    |
| `Ctrl + Shift + Z`     | Redo canvas action                    |
| `Ctrl + D` / `Cmd + D` | Duplicate selected component          |
| `Ctrl + A` / `Cmd + A` | Select all components                 |
| `Delete` / `Backspace` | Delete selected component or edge     |
| `L`                    | Auto layout (topological rank)        |
| `C`                    | Toggle Chaos Monkey failure injection |
| `M`                    | Toggle real-time metrics drawer       |
| `?`                    | Show keyboard shortcuts modal         |

---

## License

Copyright (C) 2026 Aman Ali. SysSim is licensed under the GNU General Public License v3.0 only (`GPL-3.0-only`). See [LICENSE](LICENSE), [notices](NOTICE.md), and the [dependency-license review](docs/dependency-licenses.md).
