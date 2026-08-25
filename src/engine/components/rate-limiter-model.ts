import { RateLimiterAlgorithm } from '../../model/types';

export class RateLimiterModel {
  private tokens: number;
  private lastRefillMs: number = 0;
  private slidingWindowTimestamps: number[] = [];

  constructor(
    private algorithm: RateLimiterAlgorithm = 'token_bucket',
    private limitQps: number = 1000,
    private windowSizeSec: number = 1
  ) {
    this.tokens = limitQps;
    this.lastRefillMs = 0;
  }

  public allowRequest(nowMs: number = 0): boolean {
    if (this.algorithm === 'token_bucket' || this.algorithm === 'leaky_bucket') {
      const elapsedMs = Math.max(0, nowMs - this.lastRefillMs);
      const refill = (elapsedMs / 1000) * this.limitQps;
      this.tokens = Math.min(this.limitQps, this.tokens + refill);
      this.lastRefillMs = nowMs;

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      return false;
    } else {
      // Sliding window counter
      const windowMs = this.windowSizeSec * 1000;
      const threshold = nowMs - windowMs;
      this.slidingWindowTimestamps = this.slidingWindowTimestamps.filter(
        (t) => t > threshold
      );

      if (this.slidingWindowTimestamps.length < this.limitQps * this.windowSizeSec) {
        this.slidingWindowTimestamps.push(nowMs);
        return true;
      }
      return false;
    }
  }

  public reset(): void {
    this.tokens = this.limitQps;
    this.lastRefillMs = 0;
    this.slidingWindowTimestamps = [];
  }
}
