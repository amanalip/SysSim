export interface ReplacementSummary {
  nodes: number;
  edges: number;
  zones?: number;
}

let confirmationInProgress = false;

/** Central confirmation gate prevents stacked prompts and accidental double activation. */
export function confirmCanvasReplacement(current: ReplacementSummary, action: string): boolean {
  if (current.nodes + current.edges + (current.zones ?? 0) === 0) return true;
  if (confirmationInProgress) return false;
  confirmationInProgress = true;
  try {
    return window.confirm(
      `${action} will replace ${current.nodes} component${current.nodes === 1 ? '' : 's'}, ${current.edges} link${current.edges === 1 ? '' : 's'}, and ${current.zones ?? 0} zone${current.zones === 1 ? '' : 's'}. You can undo the change afterward. Continue?`,
    );
  } finally {
    confirmationInProgress = false;
  }
}
