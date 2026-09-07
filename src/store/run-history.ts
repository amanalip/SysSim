import { create } from 'zustand';
import { useStore } from './use-store';
import { serializeCanvasState } from '../utils/sharing';
import { SIMULATION_ENGINE_VERSION } from '../platform/build-info';
import type { SerializedCanvasState, TrafficConfig } from '../model/types';

export interface SavedRun {
  id: number;
  elapsedMs: number;
  completed: number;
  dropped: number;
  succeeded: number;
  p95Ms: number;
  throughput: number;
  traffic: TrafficConfig;
  architecture: SerializedCanvasState;
  engineVersion: string;
  changedDuringRun: boolean;
  chaos: boolean;
}
interface RunHistory {
  runs: SavedRun[];
  baselineId: number | null;
  pinBaseline: (id: number) => void;
  clear: () => void;
}
export const useRunHistory = create<RunHistory>((set) => ({
  runs: [],
  baselineId: null,
  pinBaseline: (baselineId) => set({ baselineId }),
  clear: () => set({ runs: [], baselineId: null }),
}));

let active: {
  architecture: SerializedCanvasState;
  signature: string;
  changed: boolean;
  chaos: boolean;
} | null = null;
let unsubscribe: (() => void) | undefined;
let sequence = 0;
function signature() {
  const state = serializeCanvasState();
  // Positions and labels do not affect the modeled experiment.
  return JSON.stringify({
    nodes: state.nodes.map((node) => ({ id: node.id, config: node.data.config })),
    edges: state.edges,
    traffic: state.trafficConfig,
  });
}
export function beginRun() {
  cancelRun();
  active = {
    architecture: structuredClone(serializeCanvasState()),
    signature: signature(),
    changed: false,
    chaos: useStore.getState().isChaosMode,
  };
  unsubscribe = useStore.subscribe((next, prev) => {
    if (!active) return;
    if (next.isChaosMode) active.chaos = true;
    if (next.simulationRuntimeMode !== prev.simulationRuntimeMode && prev.simState === 'running')
      active.changed = true;
    if (
      next.nodes !== prev.nodes ||
      next.edges !== prev.edges ||
      next.trafficConfig !== prev.trafficConfig
    ) {
      active.changed ||= signature() !== active.signature;
    }
  });
}
export function cancelRun() {
  unsubscribe?.();
  unsubscribe = undefined;
  active = null;
}
export function finishRun() {
  if (!active) return;
  const context = active;
  const state = useStore.getState();
  cancelRun();
  if (state.simulationElapsedMs <= 0) return;
  const completed =
    state.metrics.totalRequestsCompleted ??
    state.metrics.totalRequestsSuccess + state.metrics.totalRequestsFailed;
  const run: SavedRun = {
    id: ++sequence,
    elapsedMs: state.simulationElapsedMs,
    completed,
    dropped: state.metrics.totalRequestsDropped ?? 0,
    succeeded: state.metrics.totalRequestsSuccess,
    p95Ms: state.metrics.p95LatencyMs || 0,
    throughput: completed / (state.simulationElapsedMs / 1000),
    traffic: structuredClone(context.architecture.trafficConfig ?? state.trafficConfig),
    architecture: context.architecture,
    engineVersion: SIMULATION_ENGINE_VERSION,
    changedDuringRun: context.changed,
    chaos: context.chaos,
  };
  useRunHistory.setState(({ runs, baselineId }) => {
    // Keep a pinned baseline even when the rolling history fills up.
    const retained = [run, ...runs].slice(0, 10);
    const baseline = runs.find((item) => item.id === baselineId);
    if (baseline && !retained.includes(baseline)) retained[retained.length - 1] = baseline;
    return { runs: retained };
  });
}
export function comparisonWarnings(left: SavedRun, right: SavedRun): string[] {
  const warnings: string[] = [];
  if (JSON.stringify(left.traffic) !== JSON.stringify(right.traffic))
    warnings.push('Workload or seed differs.');
  if (left.elapsedMs !== right.elapsedMs)
    warnings.push('Modeled durations differ; use equal durations for a controlled comparison.');
  if (left.engineVersion !== right.engineVersion) warnings.push('Engine versions differ.');
  if (left.changedDuringRun || right.changedDuringRun)
    warnings.push('Settings, architecture, or runtime changed during a run.');
  if (left.chaos || right.chaos) warnings.push('Chaos was enabled; failure timing may differ.');
  if (left.succeeded < 20 || right.succeeded < 20)
    warnings.push('Too few successful requests for a stable p95 comparison.');
  return warnings;
}
