export const SIMULATION_LIMITS = {
  maxNodes: 100,
  maxEdges: 250,
  maxConfiguredQps: 50_000,
  maxGeneratedArrivalsPerTick: 10_000,
  maxInFlightRequests: 10_000,
  maxScheduledEvents: 100_000,
  maxCompletedRequests: 1_000,
  maxRecentRequests: 100,
  maxLatencySamplesPerNode: 500,
  maxTimeSeriesPoints: 60,
  uiUpdateIntervalMs: 100,
} as const;
