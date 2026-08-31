# Simulation engine module boundaries

The engine facade remains `SysSimEngine`, while responsibilities are split behind it:

- `graph.ts` defines the validated simulation graph contract.
- `traffic-schedule.ts` owns traffic scheduling and its exhaustive pattern dispatch.
- `routing/` owns load-balancing and consistent-hashing decisions.
- `components/` owns type-specific execution models.
- `metrics/` owns capacities, bottleneck detection, and bounded rolling quantiles.
- `event-queue.ts`, `request.ts`, and `runtime-guards.ts` own state lifecycle primitives,
  request creation, work bounds, and input clamping.
- `sim-bridge.ts` and `simulation-runtime.ts` own worker/fallback lifecycle and UI delivery.

This layering keeps the public engine behavior stable while allowing high-risk algorithms to be
tested without React, Zustand, or worker globals.
