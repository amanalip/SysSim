import { RateLimiterAlgorithm } from '../../model/types';

export class RateLimiterModel {
  private tokens: number;
  private lastRefillMs: number;
  private slidingWindowTimestamps: number[] = [];

  constructor(
    private algorithm: RateLimiterAlgorithm = 'token_bucket',
    private limitQps: number = 1000,
    private windowSizeSec: number = 1
  ) {
    this.tokens = limitQps;
    this.lastRefillMs = Date.now();
  }

  public allowRequest(nowMs: number = Date.now()): boolean {
    if (this.algorithm === 'token_bucket' || this.algorithm === 'leaky_bucket') {
      // Refill tokens
      const elapsedMs = nowMs - this.lastRefillMs;
      const refill = (elapsedMs / 1000) * this.limitQps;
      this.tokens = Math.min(this.limitQps, this.tokens + refill);
      this.lastRefillMs = nowMs;

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return true;
      }
      return false;
    } else {
      // Sliding window
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
}
