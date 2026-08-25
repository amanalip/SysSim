import { CacheEvictionPolicy } from '../../model/types';

export class CacheModel {
  private cache = new Map<string, { lastAccessed: number; frequency: number }>();
  private hits = 0;
  private misses = 0;

  constructor(
    private sizeLimit: number = 1000,
    private evictionPolicy: CacheEvictionPolicy = 'LRU',
    private defaultHitRatio: number = 80
  ) {}

  public access(key: string, nowMs: number = Date.now()): { hit: boolean; latencyMs: number } {
    // Probabilistic hit ratio check combined with stateful cache lookup
    const isHit = this.cache.has(key) || Math.random() * 100 < this.defaultHitRatio;

    if (isHit) {
      this.hits++;
      const entry = this.cache.get(key) || { lastAccessed: nowMs, frequency: 0 };
      entry.lastAccessed = nowMs;
      entry.frequency++;
      this.cache.set(key, entry);
      return { hit: true, latencyMs: 2 };
    } else {
      this.misses++;
      this.put(key, nowMs);
      return { hit: false, latencyMs: 15 };
    }
  }

  public put(key: string, nowMs: number = Date.now()): void {
    if (this.cache.size >= this.sizeLimit) {
      this.evict();
    }
    this.cache.set(key, { lastAccessed: nowMs, frequency: 1 });
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    if (this.evictionPolicy === 'LFU') {
      let minFreq = Infinity;
      let targetKey: string | null = null;
      for (const [k, v] of this.cache.entries()) {
        if (v.frequency < minFreq) {
          minFreq = v.frequency;
          targetKey = k;
        }
      }
      if (targetKey) this.cache.delete(targetKey);
    } else {
      // LRU / FIFO fallback
      let oldest = Infinity;
      let targetKey: string | null = null;
      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccessed < oldest) {
          oldest = v.lastAccessed;
          targetKey = k;
        }
      }
      if (targetKey) this.cache.delete(targetKey);
    }
  }

  public getHitRatioPercent(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : this.defaultHitRatio;
  }
}
