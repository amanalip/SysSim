export type GraphMutationListener = () => void;

let graphMutationListener: GraphMutationListener | null = null;
let resetListener: (() => void) | null = null;

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
