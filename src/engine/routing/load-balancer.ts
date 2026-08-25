import { LoadBalancerAlgorithm } from '../../model/types';
import { ConsistentHashRing } from './consistent-hashing';

export class LoadBalancerRouter {
  private rrIndex = 0;
  private ring: ConsistentHashRing | null = null;
  private weightedTargets: string[] = [];

  constructor(
    private algorithm: LoadBalancerAlgorithm,
    private targets: string[] = [],
    weights?: Record<string, number>
  ) {
    this.updateTargets(targets, weights);
  }

  public updateTargets(targets: string[], weights?: Record<string, number>): void {
    this.targets = targets;
    if (this.algorithm === 'consistent_hashing') {
      this.ring = new ConsistentHashRing(targets);
    } else if (this.algorithm === 'weighted') {
      this.weightedTargets = [];
      targets.forEach((t) => {
        const weight = weights && weights[t] ? Math.max(1, weights[t]) : 1;
        for (let i = 0; i < weight; i++) {
          this.weightedTargets.push(t);
        }
      });
    }
  }

  public selectTarget(
    requestKey: string,
    activeConnections: Record<string, number> = {}
  ): string | null {
    if (this.targets.length === 0) return null;

    switch (this.algorithm) {
      case 'round_robin': {
        const target = this.targets[this.rrIndex % this.targets.length];
        this.rrIndex = (this.rrIndex + 1) % this.targets.length;
        return target;
      }

      case 'least_connections': {
        let minConns = Infinity;
        let bestTarget = this.targets[0];
        for (const t of this.targets) {
          const conns = activeConnections[t] || 0;
          if (conns < minConns) {
            minConns = conns;
            bestTarget = t;
          }
        }
        return bestTarget;
      }

      case 'consistent_hashing': {
        if (!this.ring) this.ring = new ConsistentHashRing(this.targets);
        return this.ring.getNode(requestKey);
      }

      case 'weighted': {
        if (this.weightedTargets.length > 0) {
          const target = this.weightedTargets[this.rrIndex % this.weightedTargets.length];
          this.rrIndex = (this.rrIndex + 1) % this.weightedTargets.length;
          return target;
        }
        return this.targets[0];
      }

      case 'ip_hash': {
        let hash = 0;
        for (let i = 0; i < requestKey.length; i++) {
          hash = (hash << 5) - hash + requestKey.charCodeAt(i);
        }
        const index = Math.abs(hash) % this.targets.length;
        return this.targets[index];
      }

      default:
        return this.targets[0];
    }
  }
}
