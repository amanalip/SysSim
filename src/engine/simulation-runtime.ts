import { beginRun, cancelRun, finishRun, useRunHistory } from '../store/run-history';
import { useStore } from '../store/use-store';
import { SimulationBridge } from './sim-bridge';
import {
  configureGraphMutationListener,
  configureSimulationResetListener,
  configureTrafficConfigListener,
} from './simulation-command-bus';
import { recordWorkerPerformance } from '../diagnostics/runtime-performance';

let bridge: SimulationBridge | null = null;

function createBridge(): SimulationBridge {
  return new SimulationBridge(
    () => {
      const state = useStore.getState();
      return {
        graph: {
          nodes: state.nodes.map((node) => ({ id: node.id, config: node.data.config })),
          edges: state.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            data: edge.data,
          })),
        },
        graphRevision: state.graphRevision,
        trafficConfig: state.trafficConfig,
        speedMultiplier: state.speedMultiplier,
        simState: state.simState,
      };
    },
    {
      onTick: ({ metrics, activeRequests, recentRequests, elapsedSimulationMs, performance }) => {
        if (performance) recordWorkerPerformance(performance.stepCpuMs, performance.messageBytes);
        const state = useStore.getState();
        state.updateMetrics(metrics);
        state.setActiveRequests(activeRequests);
        state.setRecentRequests(recentRequests);
        state.setSimulationTiming(elapsedSimulationMs, Date.now());
      },
      onStopped: (accepted) => {
        if (accepted) finishRun();
        else {
          cancelRun();
          useStore
            .getState()
            .addToast(
              'Run summary skipped because the architecture changed while stopping.',
              'warning',
            );
        }
      },
      onStateChange: (simState) => useStore.getState().setSimState(simState),
      onModeChange: (simulationRuntimeMode) => {
        if (useRunHistory.getState().isFinishing) cancelRun();
        useStore.setState({ simulationRuntimeMode });
      },
      onReset: () => {
        cancelRun();
        useStore.getState().resetSimulation();
      },
      onError: (category, message) =>
        useStore
          .getState()
          .addToast(
            `${category === 'worker' ? 'Worker' : 'Engine'} error: ${message}. Safe fallback enabled.`,
            'warning',
          ),
    },
  );
}

function getBridge(): SimulationBridge {
  if (!bridge) bridge = createBridge();
  return bridge;
}

export function initializeSimulationRuntime(): void {
  const runtime = getBridge();
  runtime.initialize();
  configureGraphMutationListener(() => runtime.syncGraph());
  configureSimulationResetListener(() => runtime.reset());
  configureTrafficConfigListener((config) => runtime.syncConfig(config));
}

export function disposeSimulationRuntime(): void {
  configureGraphMutationListener(null);
  configureSimulationResetListener(null);
  configureTrafficConfigListener(null);
  cancelRun();
  bridge?.dispose();
  bridge = null;
}

export const simulationRuntime = {
  initialize: initializeSimulationRuntime,
  dispose: disposeSimulationRuntime,
  syncGraph: () => getBridge().syncGraph(),
  syncConfig: (config: Parameters<SimulationBridge['syncConfig']>[0]) =>
    getBridge().syncConfig(config),
  setSpeed: (speed: number) => getBridge().setSpeed(speed),
  start: () => {
    const runtime = getBridge();
    if (runtime.isStopping()) return;
    if (useStore.getState().simState === 'stopped') runtime.reset();
    beginRun();
    runtime.start();
  },
  pause: () => getBridge().pause(),
  resume: () => getBridge().resume(),
  step: () => getBridge().step(),
  stop: () => {
    if (useStore.getState().simState === 'stopped') return;
    useRunHistory.setState({ isFinishing: true });
    getBridge().stop();
  },
  reset: () => getBridge().reset(),
  getMode: () => getBridge().getMode(),
};
