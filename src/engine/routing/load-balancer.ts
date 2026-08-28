import { LoadBalancerAlgorithm } from '../../model/types';
import { ConsistentHashRing } from './consistent-hashing';

export interface LoadBalancerSelectionContext {
  requestKey: string;
  clientKey: string;
  activeConnections?: Record<string, number>;
}

/** Deterministic routing over the currently eligible target set. */
export class LoadBalancerRouter {
  private rrIndex = 0;
  private ring: ConsistentHashRing | null = null;
  private weights: Record<string, number> = {};
  private currentWeights: Record<string, number> = {};

  constructor(
    private algorithm: LoadBalancerAlgorithm,
    private targets: string[] = [],
    weights: Record<string, number> = {},
  ) { this.updateTargets(targets, weights); }

  public updateTargets(targets: string[], weights: Record<string, number> = this.weights): void {
    const changed = targets.length !== this.targets.length || targets.some((target, index) => target !== this.targets[index]);
    this.targets = [...targets];
    this.weights = { ...weights };
    if (changed || !this.ring) this.ring = new ConsistentHashRing(this.targets);
    for (const target of Object.keys(this.currentWeights)) {
      if (!this.targets.includes(target)) delete this.currentWeights[target];
    }
  }

  public selectTarget(
    selection: LoadBalancerSelectionContext | string,
    legacyActiveConnections: Record<string, number> = {},
  ): string | null {
    if (this.targets.length === 0) return null;
    const context = typeof selection === 'string'
      ? { requestKey: selection, clientKey: selection, activeConnections: legacyActiveConnections }
      : selection;
    switch (this.algorithm) {
      case 'round_robin': return this.selectRoundRobin(this.targets);
      case 'least_connections': {
        const activeConnections = context.activeConnections || {};
        const minimum = Math.min(...this.targets.map((target) => activeConnections[target] || 0));
        return this.selectRoundRobin(this.targets.filter((target) => (activeConnections[target] || 0) === minimum));
      }
      case 'consistent_hashing':
        return this.ring?.getNode(context.requestKey) || null;
      case 'weighted':
        return this.selectSmoothWeightedTarget();
      case 'ip_hash':
        return this.targets[this.stableHash(context.clientKey) % this.targets.length];
      default:
        return this.targets[0];
    }
  }

  private selectRoundRobin(candidates: string[]): string {
    const target = candidates[this.rrIndex % candidates.length];
    this.rrIndex = (this.rrIndex + 1) % Number.MAX_SAFE_INTEGER;
    return target;
  }

  private selectSmoothWeightedTarget(): string {
    let selected = this.targets[0];
    let selectedWeight = Number.NEGATIVE_INFINITY;
    let totalWeight = 0;
    for (const target of this.targets) {
      const weight = Math.max(1, Math.floor(this.weights[target] || 1));
      totalWeight += weight;
      const current = (this.currentWeights[target] || 0) + weight;
      this.currentWeights[target] = current;
      if (current > selectedWeight) { selected = target; selectedWeight = current; }
    }
    this.currentWeights[selected] -= totalWeight;
    return selected;
  }

  private stableHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}
