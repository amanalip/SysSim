import { RateLimiterAlgorithm } from '../../model/types';

export interface RateLimitDecision {
  allowed: boolean;
  latencyMs: number;
  queued: boolean;
  reason?: 'burst_exhausted' | 'window_exhausted' | 'queue_full';
}

/** Four deliberately distinct rate-limiting algorithms driven only by simulation time. */
export class RateLimiterModel {
  private tokens: number;
  private lastUpdateMs = 0;
  private slidingWindowTimestamps: number[] = [];
  private fixedWindowIndex = -1;
  private fixedWindowCount = 0;
  private leakyQueueDepth = 0;
  private accepted = 0;
  private rejected = 0;
  private queued = 0;
  private decisionLatencyTotalMs = 0;

  constructor(
    private algorithm: RateLimiterAlgorithm = 'token_bucket',
    private limitQps: number = 1000,
    private windowSizeSec: number = 1,
    private burstCapacity: number = limitQps,
    private decisionLatencyMs: number = 0.5,
  ) {
    this.tokens = Math.max(0, burstCapacity);
  }

  public evaluateRequest(nowMs: number = 0): RateLimitDecision {
    const limit = Math.max(0, this.limitQps);
    const windowMs = Math.max(1, this.windowSizeSec * 1000);
    let decision: RateLimitDecision;

    if (this.algorithm === 'token_bucket') {
      const elapsedMs = Math.max(0, nowMs - this.lastUpdateMs);
      this.tokens = Math.min(
        Math.max(0, this.burstCapacity),
        this.tokens + (elapsedMs / 1000) * limit,
      );
      this.lastUpdateMs = nowMs;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        decision = { allowed: true, latencyMs: this.decisionLatencyMs, queued: false };
      } else {
        decision = {
          allowed: false,
          latencyMs: this.decisionLatencyMs,
          queued: false,
          reason: 'burst_exhausted',
        };
      }
    } else if (this.algorithm === 'leaky_bucket') {
      const elapsedMs = Math.max(0, nowMs - this.lastUpdateMs);
      this.leakyQueueDepth = Math.max(0, this.leakyQueueDepth - (elapsedMs / 1000) * limit);
      this.lastUpdateMs = nowMs;
      if (this.leakyQueueDepth + 1 > Math.max(0, this.burstCapacity)) {
        decision = {
          allowed: false,
          latencyMs: this.decisionLatencyMs,
          queued: false,
          reason: 'queue_full',
        };
      } else {
        const queueDelayMs = limit > 0 ? (this.leakyQueueDepth / limit) * 1000 : 0;
        this.leakyQueueDepth += 1;
        decision = {
          allowed: true,
          latencyMs: this.decisionLatencyMs + queueDelayMs,
          queued: queueDelayMs > 0,
        };
      }
    } else if (this.algorithm === 'fixed_window') {
      const windowIndex = Math.floor(nowMs / windowMs);
      if (windowIndex !== this.fixedWindowIndex) {
        this.fixedWindowIndex = windowIndex;
        this.fixedWindowCount = 0;
      }
      const capacity = Math.max(0, Math.floor(limit * this.windowSizeSec));
      if (this.fixedWindowCount < capacity) {
        this.fixedWindowCount++;
        decision = { allowed: true, latencyMs: this.decisionLatencyMs, queued: false };
      } else {
        decision = {
          allowed: false,
          latencyMs: this.decisionLatencyMs,
          queued: false,
          reason: 'window_exhausted',
        };
      }
    } else {
      const threshold = nowMs - windowMs;
      this.slidingWindowTimestamps = this.slidingWindowTimestamps.filter(
        (timestamp) => timestamp > threshold,
      );
      const capacity = Math.max(0, Math.floor(limit * this.windowSizeSec));
      if (this.slidingWindowTimestamps.length < capacity) {
        this.slidingWindowTimestamps.push(nowMs);
        decision = { allowed: true, latencyMs: this.decisionLatencyMs, queued: false };
      } else {
        decision = {
          allowed: false,
          latencyMs: this.decisionLatencyMs,
          queued: false,
          reason: 'window_exhausted',
        };
      }
    }

    if (decision.allowed) this.accepted++;
    else this.rejected++;
    if (decision.queued) this.queued++;
    this.decisionLatencyTotalMs += decision.latencyMs;
    return decision;
  }

  public allowRequest(nowMs: number = 0): boolean {
    return this.evaluateRequest(nowMs).allowed;
  }

  public getMetrics() {
    const decisions = this.accepted + this.rejected;
    return {
      accepted: this.accepted,
      rejected: this.rejected,
      queued: this.queued,
      averageDecisionLatencyMs: decisions ? this.decisionLatencyTotalMs / decisions : 0,
    };
  }

  public reset(): void {
    this.tokens = Math.max(0, this.burstCapacity);
    this.lastUpdateMs = 0;
    this.slidingWindowTimestamps = [];
    this.fixedWindowIndex = -1;
    this.fixedWindowCount = 0;
    this.leakyQueueDepth = 0;
    this.accepted = 0;
    this.rejected = 0;
    this.queued = 0;
    this.decisionLatencyTotalMs = 0;
  }
}
