import { CacheEvictionPolicy } from '../../model/types';

interface CacheEntry {
  insertedAt: number;
  lastAccessed: number;
  frequency: number;
  expiresAt: number;
}

export interface CacheModelOptions {
  sizeLimit: number;
  evictionPolicy: CacheEvictionPolicy;
  ttlMs: number;
  readLatencyMs: number;
}

/** Stateful cache-aside store with deterministic, policy-specific eviction. */
export class CacheModel {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private readonly options: CacheModelOptions;

  constructor(
    options: CacheModelOptions | number = {
      sizeLimit: 1000,
      evictionPolicy: 'LRU',
      ttlMs: Number.MAX_SAFE_INTEGER,
      readLatencyMs: 2,
    },
    legacyEvictionPolicy: CacheEvictionPolicy = 'LRU',
    _legacyHitRatio: number = 100,
  ) {
    const normalizedOptions: CacheModelOptions =
      typeof options === 'number'
        ? {
            sizeLimit: options,
            evictionPolicy: legacyEvictionPolicy,
            ttlMs: Number.MAX_SAFE_INTEGER,
            readLatencyMs: 2,
          }
        : options;
    this.options = {
      ...normalizedOptions,
      sizeLimit: Math.max(1, Math.floor(normalizedOptions.sizeLimit)),
      ttlMs: Math.max(1, normalizedOptions.ttlMs),
      readLatencyMs: Math.max(0, normalizedOptions.readLatencyMs),
    };
  }

  public access(
    key: string,
    nowMs: number = Date.now(),
    allowConfiguredHit: boolean = true,
  ): { hit: boolean; latencyMs: number } {
    this.deleteIfExpired(key, nowMs);
    const entry = this.cache.get(key);
    if (!entry || !allowConfiguredHit) {
      this.misses++;
      return { hit: false, latencyMs: this.options.readLatencyMs };
    }

    this.hits++;
    entry.lastAccessed = nowMs;
    entry.frequency++;
    return { hit: true, latencyMs: this.options.readLatencyMs };
  }

  /** Populates only after a successful origin response. */
  public put(key: string, nowMs: number = Date.now()): boolean {
    this.purgeExpired(nowMs);
    if (!this.cache.has(key) && this.cache.size >= this.options.sizeLimit) {
      this.evict(nowMs);
    }
    this.cache.set(key, {
      insertedAt: nowMs,
      lastAccessed: nowMs,
      frequency: 1,
      expiresAt: nowMs + this.options.ttlMs,
    });
    return true;
  }

  private deleteIfExpired(key: string, nowMs: number): void {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt <= nowMs) this.cache.delete(key);
  }

  private purgeExpired(nowMs: number): void {
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= nowMs) this.cache.delete(key);
    }
  }

  private evict(nowMs: number): void {
    if (this.cache.size === 0) return;
    let targetKey: string | undefined;
    let targetScore = Infinity;

    for (const [key, entry] of this.cache) {
      const score =
        this.options.evictionPolicy === 'LFU'
          ? entry.frequency
          : this.options.evictionPolicy === 'FIFO'
            ? entry.insertedAt
            : this.options.evictionPolicy === 'TTL'
              ? entry.expiresAt
              : entry.lastAccessed;
      if (score < targetScore) {
        targetKey = key;
        targetScore = score;
      }
    }

    if (targetKey) this.cache.delete(targetKey);
    this.purgeExpired(nowMs);
  }

  public getHitRatioPercent(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  public getCounts(): { hits: number; misses: number } {
    return { hits: this.hits, misses: this.misses };
  }

  public getSize(): number {
    return this.cache.size;
  }

  public has(key: string, nowMs: number = Date.now()): boolean {
    this.deleteIfExpired(key, nowMs);
    return this.cache.has(key);
  }

  public reset(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
