import { ApiGatewayConfig } from '../../model/types';
import { RateLimiterModel } from './rate-limiter-model';

type CircuitState = 'closed' | 'open' | 'half_open';

export interface ApiGatewayMetrics {
  throttles: number;
  timeouts: number;
  openCircuitRejections: number;
  circuitState: CircuitState;
}

const AUTH_OVERHEAD_MS: Record<ApiGatewayConfig['authMode'], number> = {
  None: 0.2,
  API_Key: 0.5,
  JWT: 2,
  OAuth2: 4,
};

/** Gateway policy model. Circuit opens after 3 failures for 10 simulated seconds. */
export class ApiGatewayModel {
  private limiter: RateLimiterModel;
  private consecutiveFailures = 0;
  private circuitState: CircuitState = 'closed';
  private openedAtMs = 0;
  private throttles = 0;
  private timeouts = 0;
  private openCircuitRejections = 0;

  constructor(private config: ApiGatewayConfig) {
    this.limiter = new RateLimiterModel('token_bucket', Math.max(0, config.rateLimitQps), 1);
  }

  public updateConfig(config: ApiGatewayConfig): void {
    if (config.rateLimitQps !== this.config.rateLimitQps) {
      this.limiter = new RateLimiterModel('token_bucket', Math.max(0, config.rateLimitQps), 1);
    }
    this.config = config;
    if (!config.circuitBreakerEnabled) {
      this.consecutiveFailures = 0;
      this.circuitState = 'closed';
    }
  }

  public begin(nowMs: number): { allowed: boolean; reason?: 'throttled' | 'open_circuit'; latencyMs: number } {
    if (this.config.circuitBreakerEnabled && this.circuitState === 'open') {
      if (nowMs - this.openedAtMs >= 10_000) this.circuitState = 'half_open';
      else {
        this.openCircuitRejections++;
        return { allowed: false, reason: 'open_circuit', latencyMs: 0.5 };
      }
    }
    if (!this.limiter.allowRequest(nowMs)) {
      this.throttles++;
      return { allowed: false, reason: 'throttled', latencyMs: 1 };
    }
    return { allowed: true, latencyMs: AUTH_OVERHEAD_MS[this.config.authMode] };
  }

  public finish(nowMs: number, downstreamLatencyMs: number, success: boolean): { timedOut: boolean } {
    const timedOut = downstreamLatencyMs > Math.max(1, this.config.timeoutMs);
    if (timedOut) this.timeouts++;
    if (timedOut || !success) {
      this.consecutiveFailures++;
      if (this.config.circuitBreakerEnabled && (this.circuitState === 'half_open' || this.consecutiveFailures >= 3)) {
        this.circuitState = 'open';
        this.openedAtMs = nowMs;
      }
    } else {
      this.consecutiveFailures = 0;
      this.circuitState = 'closed';
    }
    return { timedOut };
  }

  public getMetrics(): ApiGatewayMetrics {
    return {
      throttles: this.throttles,
      timeouts: this.timeouts,
      openCircuitRejections: this.openCircuitRejections,
      circuitState: this.circuitState,
    };
  }

  public reset(): void {
    this.limiter.reset();
    this.consecutiveFailures = 0;
    this.circuitState = 'closed';
    this.openedAtMs = 0;
    this.throttles = 0;
    this.timeouts = 0;
    this.openCircuitRejections = 0;
  }
}
