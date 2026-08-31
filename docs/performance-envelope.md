# Tested performance envelope

SysSim is an educational, single-browser simulation. The enforced architecture boundary is 100
nodes, 250 simulation edges, 50,000 configured QPS, 10,000 generated arrivals per tick, 10,000
in-flight requests, and 100,000 scheduled events. Architecture imports allow up to 500 edges so a
diagram can be repaired or inspected, but the engine consumes a bounded 250-edge view.

## Representative environment

Automated budgets run on GitHub-hosted `ubuntu-latest` runners with Node.js 20/24 and on a typical
four-core developer browser. Results are regression signals, not production capacity claims. The
suite profiles 10, 100, 500 requested nodes (500 is clamped to the supported maximum), sparse and
dense graphs, 1/500/50,000 QPS, high fanout, queue depth, structured-clone size/time, long-running
retention, pause/reset/graph-edit responsiveness, and worker message/CPU sampling.

## UI budgets

- Worker-to-UI telemetry is published at most every 100 ms.
- The runtime records worker step CPU time, serialized message bytes, UI FPS, and browser heap when
  the platform exposes it. Diagnostic reports contain only shape and runtime metadata.
- Particle rendering adapts from 40 to 24 or 12 particles based on graph size and logical CPU count;
  reduced-motion mode disables particles.
- Scenario and component lists are modest (currently roughly 101 scenarios and fewer than 50
  component entries). Full virtualization measured as unnecessary complexity, so off-screen cards
  use `content-visibility: auto` and intrinsic-size placeholders instead.
- PNG export captures the visible canvas once, excludes transient controls/particles, waits for the
  next frame, and caps device pixel ratio at 2.

Inputs beyond the documented boundary are rejected at architecture-validation boundaries or
clamped at the engine boundary. The UI remains recoverable and reports validation, worker, export,
or persistence failures without treating them as successful operations.
