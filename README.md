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

Visit `http://localhost:5173/SysSim/` during local development. Vite intentionally uses the same `/SysSim/` base path as GitHub Pages; `http://localhost:5173/` is not the application route. The deployed application is served from `https://amanalip.github.io/SysSim/`. Direct deployment routes are recovered by `public/404.html`, including architecture data stored in the URL hash.

The supported browser and viewport matrix is maintained in the [product contract](docs/product-contract.md#supported-environment).

---

## Development Scripts

| Script                                          | Purpose                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                                   | Start the Vite development server at `/SysSim/`.                     |
| `npm run build`                                 | Type-check and create production assets in `dist/`.                  |
| `npm run preview`                               | Serve the production build locally.                                  |
| `npm run test` / `test:watch` / `test:coverage` | Run Vitest once, interactively, or with enforced coverage.           |
| `npm run test:accessibility`                    | Run focused automated accessibility contracts.                       |
| `npm run test:performance`                      | Run bounded engine and rendering performance tests.                  |
| `npm run test:e2e` / `test:e2e:release`         | Run Playwright locally or across Chromium, Firefox, and WebKit.      |
| `npm run test:e2e:production`                   | Build and test production assets under the `/SysSim/` base path.     |
| `npm run lint` / `lint:fix`                     | Check or repair lint violations.                                     |
| `npm run typecheck`                             | Check TypeScript without emitting files.                             |
| `npm run format` / `format:check`               | Write or verify Prettier formatting.                                 |
| `npm run check:duplicates`                      | Enforce the duplicate-code budget and write a report.                |
| `npm run check:bundle`                          | Build and enforce JavaScript/CSS bundle budgets.                     |
| `npm run check:security`                        | Fail on high-severity npm advisories.                                |
| `npm run check:licenses`                        | Validate dependency licenses against project policy.                 |
| `npm run check:scenario-links`                  | Verify scenario citation reachability and classify restricted hosts. |
| `npm run test:scenario-content`                 | Audit scenario structure, provenance, and reference graphs.          |
| `npm run generate:sbom`                         | Generate a CycloneDX release SBOM.                                   |
| `npm run release:verify`                        | Run the reproducible local release gate.                             |

## Data and privacy

- JSON exports and browser snapshots contain component names, positions, configuration, zones, and traffic settings. Treat them as architecture documents.
- Snapshot slots and learning progress remain in browser `localStorage` until cleared. SysSim has no application server receiving them.
- Share links contain compressed architecture JSON in the URL hash. The hash is not normally sent as an HTTP request, but the complete URL can remain in browser history, screenshots, clipboard managers, support tickets, or analytics tooling that reads the address.
- PNG exports contain the visible canvas. Diagnostic exports deliberately exclude architecture names, configuration values, scenario notes, URL hashes, and request traces.
- Imported JSON and hash data are untrusted, bounded, migrated, and schema-validated before entering application state.

See [persistence and privacy](docs/persistence.md), [browser security](docs/browser-security.md), and the [security policy](SECURITY.md).

## How outputs are derived

Simulation metrics come from deterministic, seeded discrete events and distinguish offered, accepted, completed, failed, and dropped requests. Rolling percentiles use bounded successful-request windows. Capacity and cost calculators use visible formulas and user-entered assumptions; they do not query providers or predict production performance. Definitions and sampling windows are documented in [metrics semantics](docs/metrics-semantics.md), [capacity calculator](docs/capacity-calculator.md), and [cost estimation](docs/cost-estimation.md).

## Project documentation

- [Architecture overview](docs/architecture.md) and [module boundaries](docs/architecture-boundaries.md)
- [Testing strategy](docs/testing.md) and [release process](docs/release-process.md)
- [Contributing](CONTRIBUTING.md), [security](SECURITY.md), and [changelog](CHANGELOG.md)
- [Persistence schemas](docs/persistence.md), [simulation semantics](docs/simulation-clock.md), and [quality rubric](docs/quality-rubric.md)

The feature list above is reviewed by the automated product-claim and README contract tests. A feature must be implemented, documented with its limitations, and covered by evidence before it is added.

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
