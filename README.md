# SysSim

**Simulate before you scale.**

SysSim is an interactive system design simulation platform. Build architectures on a visual drag-and-drop canvas, run discrete-event traffic simulations, inject failures, inspect bottlenecks, and practice 101 system design scenarios with verified citations and progressive hints.

---

## Features

- **Interactive Canvas**: Drag-and-drop 27 component types across Compute, Networking, Storage, Caching, Messaging, and Security categories.
- **Discrete Event Simulation**: Real-time traffic simulation running in a background Web Worker. Generates request flows, tracks per-hop latencies, and calculates p50/p95/p99 percentiles.
- **Traffic Patterns**: Simulate Steady, Bursty, Ramp-up, and Spike traffic profiles with customizable base QPS.
- **Failure Injection & Chaos Mode**: Mark components down, cut network connections, and trigger automated Chaos Monkey fault injection.
- **Bottleneck Detection**: Automatic analysis of single points of failure (SPOFs), missing cache tiers, and capacity overloads.
- **Capacity Calculator**: Back-of-envelope math computing storage growth, replication multipliers, network bandwidth, server instance sizing, and RAM cache recommendations.
- **101 System Design Scenarios**: Factchecked scenario library spanning 15 categories with constraints, progressive hints, reference architectures, interview discussion questions, and verified source citations.
- **Sharing & Export**: Compress architecture state into URL hashes with LZ-string, export PNG diagrams, and save/load JSON schemas.

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

### Prerequisites

Node.js 20 or higher is required.

### Installation

```bash
# Clone repository
git clone https://github.com/amanalip/SysSim.git
cd SysSim

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

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

| Key | Action |
| --- | --- |
| `Space` | Start / Pause simulation |
| `Ctrl + Z` / `Cmd + Z` | Undo canvas action |
| `Ctrl + Shift + Z` | Redo canvas action |
| `Ctrl + D` / `Cmd + D` | Duplicate selected component |
| `Ctrl + A` / `Cmd + A` | Select all components |
| `Delete` / `Backspace` | Delete selected component or edge |
| `L` | Auto layout (topological rank) |
| `C` | Toggle Chaos Monkey failure injection |
| `M` | Toggle real-time metrics drawer |
| `?` | Show keyboard shortcuts modal |

---

## License

MIT License.
