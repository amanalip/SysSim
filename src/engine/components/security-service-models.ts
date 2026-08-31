import { AuthServiceConfig, EncryptionServiceConfig } from '../../model/types';
import { createRandom } from '../seeded-random';

export class AuthServiceModel {
  private cacheHits = 0;
  private cacheMisses = 0;
  private validationLatencyTotalMs = 0;
  private validations = 0;

  constructor(
    private config: AuthServiceConfig,
    private random: () => number = createRandom(),
  ) {}

  public validate() {
    let latencyMs: number;
    let cached = false;
    if (this.config.tokenType === 'Session' && this.config.sessionCacheEnabled) {
      cached =
        this.random() * 100 < Math.min(100, Math.max(0, this.config.sessionCacheHitRatePercent));
      if (cached) {
        this.cacheHits++;
        latencyMs = Math.max(0, this.config.sessionCacheLatencyMs);
      } else {
        this.cacheMisses++;
        latencyMs = Math.max(0, this.config.validationLatencyMs) * 1.5;
      }
    } else {
      const tokenFactor =
        this.config.tokenType === 'Paseto' ? 1.15 : this.config.tokenType === 'Session' ? 1.5 : 1;
      latencyMs = Math.max(0, this.config.validationLatencyMs) * tokenFactor;
    }
    this.validations++;
    this.validationLatencyTotalMs += latencyMs;
    return { latencyMs, cached, ttlDiagramOnly: true };
  }

  public getMetrics() {
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      averageValidationLatencyMs: this.validations
        ? this.validationLatencyTotalMs / this.validations
        : 0,
    };
  }

  public reset() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.validationLatencyTotalMs = 0;
    this.validations = 0;
  }
}

export class EncryptionServiceModel {
  private operations = 0;
  private latencyTotalMs = 0;
  private payloadKb = 0;

  constructor(private config: EncryptionServiceConfig) {}

  public process(payloadSizeKb: number) {
    const payloadKb = Math.max(0, payloadSizeKb);
    const algorithmFactor =
      this.config.algorithm === 'RSA-4096'
        ? 6
        : this.config.algorithm === 'ChaCha20-Poly1305'
          ? 0.8
          : 1;
    const perKbMs =
      this.config.algorithm === 'RSA-4096'
        ? 0.02
        : this.config.algorithm === 'ChaCha20-Poly1305'
          ? 0.0015
          : 0.002;
    const latencyMs =
      Math.max(0, this.config.overheadLatencyMs) * algorithmFactor + payloadKb * perKbMs;
    this.operations++;
    this.latencyTotalMs += latencyMs;
    this.payloadKb += payloadKb;
    return { latencyMs, algorithmFactor, keyRotationDiagramOnly: true };
  }

  public getMetrics() {
    return {
      operations: this.operations,
      averageLatencyMs: this.operations ? this.latencyTotalMs / this.operations : 0,
      payloadKb: this.payloadKb,
    };
  }

  public reset() {
    this.operations = 0;
    this.latencyTotalMs = 0;
    this.payloadKb = 0;
  }
}
