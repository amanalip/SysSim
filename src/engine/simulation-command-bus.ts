import { TrafficConfig } from '../model/types';

export type GraphMutationListener = () => void;
export type TrafficConfigListener = (config: Partial<TrafficConfig>) => void;

let graphMutationListener: GraphMutationListener | null = null;
let resetListener: (() => void) | null = null;
let trafficConfigListener: TrafficConfigListener | null = null;

export function configureGraphMutationListener(listener: GraphMutationListener | null): void {
  graphMutationListener = listener;
}

export function notifyGraphMutation(): void {
  graphMutationListener?.();
}

export function configureSimulationResetListener(listener: (() => void) | null): void {
  resetListener = listener;
}

export function notifySimulationReset(): void {
  resetListener?.();
}

export function configureTrafficConfigListener(listener: TrafficConfigListener | null): void {
  trafficConfigListener = listener;
}

export function notifyTrafficConfigChange(config: Partial<TrafficConfig>): void {
  trafficConfigListener?.(config);
}
