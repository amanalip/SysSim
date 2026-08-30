import { useStore } from '../store/use-store';
import { SimulationBridge } from './sim-bridge';
import { configureGraphMutationListener, configureSimulationResetListener } from './simulation-command-bus';

let bridge: SimulationBridge | null = null;

function createBridge(): SimulationBridge {
  return new SimulationBridge(
    () => {
      const state = useStore.getState();
      return {
        graph: {
          nodes: state.nodes.map((node) => ({ id: node.id, config: node.data.config })),
          edges: state.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, data: edge.data })),
        },
        graphRevision: state.graphRevision,
        trafficConfig: state.trafficConfig,
        speedMultiplier: state.speedMultiplier,
        simState: state.simState,
      };
    },
    {
      onTick: ({ metrics, activeRequests, recentRequests }) => {
        const state = useStore.getState();
        state.updateMetrics(metrics);
        state.setActiveRequests(activeRequests);
        state.setRecentRequests(recentRequests);
      },
      onStateChange: (simState) => useStore.getState().setSimState(simState),
      onModeChange: (simulationRuntimeMode) => useStore.setState({ simulationRuntimeMode }),
      onReset: () => useStore.getState().resetSimulation(),
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
}

export function disposeSimulationRuntime(): void {
  configureGraphMutationListener(null);
  configureSimulationResetListener(null);
  bridge?.dispose();
  bridge = null;
}

export const simulationRuntime = {
  initialize: initializeSimulationRuntime,
  dispose: disposeSimulationRuntime,
  syncGraph: () => getBridge().syncGraph(),
  syncConfig: (config: Parameters<SimulationBridge['syncConfig']>[0]) => getBridge().syncConfig(config),
  setSpeed: (speed: number) => getBridge().setSpeed(speed),
  start: () => getBridge().start(),
  pause: () => getBridge().pause(),
  resume: () => getBridge().resume(),
  step: () => getBridge().step(),
  stop: () => getBridge().stop(),
  reset: () => getBridge().reset(),
  getMode: () => getBridge().getMode(),
};
