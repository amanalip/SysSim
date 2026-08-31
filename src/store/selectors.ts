import type { SysSimState } from './use-store';

export type StoreSelector<T> = (state: SysSimState) => T;

export const selectGraph = (state: SysSimState) => ({
  nodes: state.nodes,
  edges: state.edges,
  zones: state.zones,
  graphRevision: state.graphRevision,
});

export const selectGraphCounts = (state: SysSimState) => ({
  nodeCount: state.nodes.length,
  edgeCount: state.edges.length,
});

export const selectSimulationSummary = (state: SysSimState) => ({
  simState: state.simState,
  speedMultiplier: state.speedMultiplier,
  runtimeMode: state.simulationRuntimeMode,
  seed: state.trafficConfig.seed || 1,
});

export const selectTelemetry = (state: SysSimState) => ({
  metrics: state.metrics,
  bottlenecks: state.bottlenecks,
  activeRequests: state.activeRequests,
  recentRequests: state.recentRequests,
});

export const selectNodeMetric =
  (nodeId: string): StoreSelector<unknown> =>
  (state) =>
    state.metrics.componentMetrics?.[nodeId];
