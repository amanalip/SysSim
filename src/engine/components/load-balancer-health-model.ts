import { NodeHealthStatus } from '../../model/types';

interface TargetHealthState {
  eligible: boolean;
  lastCheckMs: number;
  healthySinceMs?: number;
}

/** Active health checks with interval-based detection and delayed recovery. */
export class LoadBalancerHealthModel {
  private states = new Map<string, TargetHealthState>();

  public isEligible(
    targetId: string,
    actualHealth: NodeHealthStatus,
    nowMs: number,
    intervalSec: number,
    recoveryDelaySec: number,
  ): boolean {
    const healthy = actualHealth !== 'down';
    let state = this.states.get(targetId);
    if (!state) {
      state = {
        eligible: healthy,
        lastCheckMs: nowMs,
        healthySinceMs: healthy ? nowMs : undefined,
      };
      this.states.set(targetId, state);
      return state.eligible;
    }

    const intervalMs = Math.max(1, intervalSec) * 1000;
    if (nowMs - state.lastCheckMs < intervalMs) return state.eligible;
    state.lastCheckMs = nowMs;
    if (!healthy) {
      state.eligible = false;
      state.healthySinceMs = undefined;
      return false;
    }
    state.healthySinceMs ??= nowMs;
    if (nowMs - state.healthySinceMs >= Math.max(0, recoveryDelaySec) * 1000) state.eligible = true;
    return state.eligible;
  }

  public reset(): void {
    this.states.clear();
  }
}
