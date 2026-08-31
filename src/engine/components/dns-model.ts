import { DNSConfig } from '../../model/types';
import { LoadBalancerRouter } from '../routing/load-balancer';

interface DnsRecord {
  targetId: string;
  expiresAtMs: number;
}

export class DnsModel {
  private cache = new Map<string, DnsRecord>();
  private router: LoadBalancerRouter;
  private hits = 0;
  private misses = 0;
  private failures = 0;

  constructor(
    private config: DNSConfig,
    targets: string[] = [],
  ) {
    this.router = new LoadBalancerRouter('weighted', targets, config.targetWeights);
  }

  public update(config: DNSConfig, targets: string[]): void {
    this.config = config;
    this.router.updateTargets(targets, config.targetWeights);
  }

  public resolve(
    cacheKey: string,
    clientKey: string,
    nowMs: number,
    eligibleTargets: string[],
    edgeLatencies: Record<string, number>,
  ): { targetId: string | null; latencyMs: number; cached: boolean } {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAtMs > nowMs && eligibleTargets.includes(cached.targetId)) {
      this.hits++;
      return { targetId: cached.targetId, latencyMs: 0.2, cached: true };
    }
    this.cache.delete(cacheKey);
    this.misses++;
    let targetId: string | null = null;
    if (eligibleTargets.length > 0) {
      if (this.config.routingPolicy === 'simple') targetId = eligibleTargets[0];
      else if (this.config.routingPolicy === 'latency_based') {
        targetId = [...eligibleTargets].sort(
          (a, b) => (edgeLatencies[a] ?? 4) - (edgeLatencies[b] ?? 4),
        )[0];
      } else if (this.config.routingPolicy === 'geolocation') {
        targetId = eligibleTargets[this.stableHash(clientKey) % eligibleTargets.length];
      } else {
        this.router.updateTargets(eligibleTargets, this.config.targetWeights);
        targetId = this.router.selectTarget({ requestKey: cacheKey, clientKey }) as string | null;
      }
    }
    if (!targetId) this.failures++;
    else
      this.cache.set(cacheKey, {
        targetId,
        expiresAtMs: nowMs + Math.max(1, this.config.ttlSec) * 1000,
      });
    return { targetId, latencyMs: Math.max(0, this.config.lookupLatencyMs), cached: false };
  }

  public getMetrics() {
    return { hits: this.hits, misses: this.misses, failures: this.failures };
  }
  public reset(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.failures = 0;
    this.router.reset();
  }

  private stableHash(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}
