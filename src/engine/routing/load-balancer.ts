import { LoadBalancerAlgorithm } from '../../model/types';
import { ConsistentHashRing } from './consistent-hashing';

export interface LoadBalancerSelectionContext {
  requestKey: string;
  clientKey: string;
  activeConnections?: Record<string, number>;
  stickySession?: boolean;
}

/** Deterministic routing over the currently eligible target set. */
export class LoadBalancerRouter {
  private rrIndex = 0;
  private ring: ConsistentHashRing | null = null;
  private weights: Record<string, number> = {};
  private currentWeights: Record<string, number> = {};
  private stickyTargets = new Map<string, string>();
  private routeCounts: Record<string, number> = {};
  private unavailableTargetFailures = 0;

  constructor(
    private algorithm: LoadBalancerAlgorithm,
    private targets: string[] = [],
    weights: Record<string, number> = {},
  ) {
    this.updateTargets(targets, weights);
  }

  public updateAlgorithm(algorithm: LoadBalancerAlgorithm): void {
    if (algorithm === this.algorithm) return;
    this.algorithm = algorithm;
    this.rrIndex = 0;
    this.currentWeights = {};
    this.stickyTargets.clear();
  }

  public updateTargets(targets: string[], weights: Record<string, number> = this.weights): void {
    const changed =
      targets.length !== this.targets.length ||
      targets.some((target, index) => target !== this.targets[index]);
    this.targets = [...targets];
    this.weights = { ...weights };
    for (const target of this.targets) this.routeCounts[target] ??= 0;
    if (changed || !this.ring) this.ring = new ConsistentHashRing(this.targets);
    for (const target of Object.keys(this.currentWeights)) {
      if (!this.targets.includes(target)) delete this.currentWeights[target];
    }
    for (const target of Object.keys(this.routeCounts)) {
      if (!this.targets.includes(target)) delete this.routeCounts[target];
    }
    for (const [clientKey, target] of this.stickyTargets) {
      if (!this.targets.includes(target)) this.stickyTargets.delete(clientKey);
    }
  }

  public selectTarget(
    selection: LoadBalancerSelectionContext | string,
    legacyActiveConnections: Record<string, number> = {},
  ): string | null {
    if (this.targets.length === 0) return null;
    const context =
      typeof selection === 'string'
        ? {
            requestKey: selection,
            clientKey: selection,
            activeConnections: legacyActiveConnections,
          }
        : selection;
    if (context.stickySession) {
      const stickyTarget = this.stickyTargets.get(context.clientKey);
      if (stickyTarget && this.targets.includes(stickyTarget)) {
        this.recordRoute(stickyTarget);
        return stickyTarget;
      }
    }
    let target: string | null;
    switch (this.algorithm) {
      case 'round_robin':
        target = this.selectRoundRobin(this.targets);
        break;
      case 'least_connections': {
        const activeConnections = context.activeConnections || {};
        const minimum = Math.min(...this.targets.map((target) => activeConnections[target] || 0));
        target = this.selectRoundRobin(
          this.targets.filter((target) => (activeConnections[target] || 0) === minimum),
        );
        break;
      }
      case 'consistent_hashing':
        target = this.ring?.getNode(context.requestKey) || null;
        break;
      case 'weighted':
        target = this.selectSmoothWeightedTarget();
        break;
      case 'ip_hash':
        target = this.targets[this.stableHash(context.clientKey) % this.targets.length];
        break;
      default:
        target = this.targets[0];
    }
    if (target) {
      if (context.stickySession) this.stickyTargets.set(context.clientKey, target);
      this.recordRoute(target);
    }
    return target;
  }

  public recordUnavailableTargetFailure(): void {
    this.unavailableTargetFailures++;
  }

  public getMetrics(): { unavailableTargetFailures: number; distributionSkewPercent: number } {
    const counts = Object.values(this.routeCounts);
    if (counts.length < 2)
      return {
        unavailableTargetFailures: this.unavailableTargetFailures,
        distributionSkewPercent: 0,
      };
    const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const skew = average > 0 ? ((Math.max(...counts) - Math.min(...counts)) / average) * 100 : 0;
    return {
      unavailableTargetFailures: this.unavailableTargetFailures,
      distributionSkewPercent: Math.round(skew * 10) / 10,
    };
  }

  public reset(): void {
    this.rrIndex = 0;
    this.currentWeights = {};
    this.stickyTargets.clear();
    this.routeCounts = {};
    this.unavailableTargetFailures = 0;
  }

  private recordRoute(target: string): void {
    this.routeCounts[target] = (this.routeCounts[target] || 0) + 1;
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
      if (current > selectedWeight) {
        selected = target;
        selectedWeight = current;
      }
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
