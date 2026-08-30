import { describe, expect, it } from 'vitest';
import { RateLimiterModel } from '../engine/components/rate-limiter-model';
import { createSimRequest } from '../engine/request';
import { SimGraph, SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import {
  AuthServiceConfig,
  EncryptionServiceConfig,
  RateLimiterConfig,
  SimRequest,
  TimeSeriesDbConfig,
} from '../model/types';

const traffic = { pattern: 'steady' as const, baseQps: 0, burstMultiplier: 1, rampDurationSec: 1, spikeFrequencySec: 1, seed: 51 };
const engineFor = (config: TimeSeriesDbConfig | RateLimiterConfig | AuthServiceConfig | EncryptionServiceConfig) =>
  new SysSimEngine({ nodes: [{ id: 'component', config }], edges: [] } satisfies SimGraph, traffic);
const execute = (engine: SysSimEngine, id: number, timestamp = 0, payloadSizeKb = 0, operationType: 'read' | 'write' = 'read') => {
  const request = createSimRequest('component', timestamp, `key-${id}`, id, { payloadSizeKb, operationType });
  (engine as unknown as { processRequest: (value: SimRequest) => void }).processRequest(request);
  return request;
};

describe('time-series task 141', () => {
  it('applies cold-tier latency only when explicitly enabled and retained data crosses the threshold', () => {
    const hot = engineFor({ ...(createDefaultConfig('timeseries_db', 'component') as TimeSeriesDbConfig), retentionDays: 90, queryLatencyMs: 10, coldTierEnabled: false });
    const cold = engineFor({ ...(createDefaultConfig('timeseries_db', 'component') as TimeSeriesDbConfig), retentionDays: 90, queryLatencyMs: 10, coldTierEnabled: true, coldTierAfterDays: 30, coldTierLatencyMultiplier: 4 });
    const hotQuery = execute(hot, 1);
    const coldQuery = execute(cold, 1);
    expect(coldQuery.totalLatencyMs).toBeGreaterThan(hotQuery.totalLatencyMs);
    expect(coldQuery.path[0].info).toContain('cold tier after 30d');
    expect(cold.getMetricsSnapshot().componentMetrics.component).toMatchObject({ timeSeriesColdTierQueries: 1, timeSeriesColdTierLatencyFactor: 3 });
  });
});

describe('rate-limiter tasks 142-145', () => {
  it('keeps token and leaky buckets behaviorally distinct with deterministic burst capacity', () => {
    const token = new RateLimiterModel('token_bucket', 1, 1, 2, 0.5);
    expect([token.evaluateRequest(0).allowed, token.evaluateRequest(0).allowed, token.evaluateRequest(0).allowed]).toEqual([true, true, false]);
    expect(token.evaluateRequest(1000).allowed).toBe(true);

    const leaky = new RateLimiterModel('leaky_bucket', 1, 1, 2, 0.5);
    expect(leaky.evaluateRequest(0)).toMatchObject({ allowed: true, queued: false, latencyMs: 0.5 });
    expect(leaky.evaluateRequest(0)).toMatchObject({ allowed: true, queued: true, latencyMs: 1000.5 });
    expect(leaky.evaluateRequest(0)).toMatchObject({ allowed: false, reason: 'queue_full' });
  });

  it('keeps fixed and sliding windows distinct across exact boundaries', () => {
    const fixed = new RateLimiterModel('fixed_window', 2, 1, 2, 0.25);
    expect(fixed.allowRequest(999)).toBe(true);
    expect(fixed.allowRequest(999)).toBe(true);
    expect(fixed.allowRequest(1000)).toBe(true);
    expect(fixed.allowRequest(1000)).toBe(true);

    const sliding = new RateLimiterModel('sliding_window', 2, 1, 2, 0.25);
    expect(sliding.allowRequest(999)).toBe(true);
    expect(sliding.allowRequest(999)).toBe(true);
    expect(sliding.allowRequest(1000)).toBe(false);
    expect(sliding.allowRequest(1999)).toBe(true);
  });

  it('charges explicit decision latency to rejected requests and reports it', () => {
    const config = { ...(createDefaultConfig('rate_limiter', 'component') as RateLimiterConfig), algorithm: 'fixed_window' as const, limitQps: 1, windowSizeSec: 1, burstCapacity: 1, decisionLatencyMs: 0.75 };
    const engine = engineFor(config);
    expect(execute(engine, 1, 100).status).toBe('success');
    const rejected = execute(engine, 2, 200);
    expect(rejected).toMatchObject({ status: 'rate_limited', totalLatencyMs: 0.75 });
    expect(engine.getMetricsSnapshot().componentMetrics.component).toMatchObject({ rateLimiterAccepted: 1, rateLimiterRejected: 1, rateLimiterDecisionLatencyMs: 0.8 });
  });
});

describe('authentication tasks 146-148', () => {
  it('applies token-type assumptions and modeled session-cache hits while labeling TTL diagram-only', () => {
    const jwt = engineFor({ ...(createDefaultConfig('auth_service', 'component') as AuthServiceConfig), tokenType: 'JWT' as const, validationLatencyMs: 4 });
    const paseto = engineFor({ ...(createDefaultConfig('auth_service', 'component') as AuthServiceConfig), tokenType: 'Paseto' as const, validationLatencyMs: 4 });
    expect(execute(paseto, 1).totalLatencyMs).toBeGreaterThan(execute(jwt, 1).totalLatencyMs);

    const session = engineFor({ ...(createDefaultConfig('auth_service', 'component') as AuthServiceConfig), tokenType: 'Session' as const, validationLatencyMs: 4, sessionCacheEnabled: true, sessionCacheHitRatePercent: 100, sessionCacheLatencyMs: 0.5, ttlMinutes: 30 });
    const cached = execute(session, 1);
    expect(cached.path[0].info).toContain('session cache hit');
    expect(cached.path[0].info).toContain('TTL is diagram-only');
    expect(session.getMetricsSnapshot().componentMetrics.component).toMatchObject({ authCacheHits: 1, authCacheMisses: 0, authValidationLatencyMs: 0.5 });
  });
});

describe('encryption tasks 149-151', () => {
  it('applies explicit algorithm/payload cost and keeps key rotation diagram-only', () => {
    const aes = engineFor({ ...(createDefaultConfig('encryption_service', 'component') as EncryptionServiceConfig), algorithm: 'AES-256-GCM' as const, overheadLatencyMs: 2, keyRotationDays: 30 });
    const chacha = engineFor({ ...(createDefaultConfig('encryption_service', 'component') as EncryptionServiceConfig), algorithm: 'ChaCha20-Poly1305' as const, overheadLatencyMs: 2 });
    const rsa = engineFor({ ...(createDefaultConfig('encryption_service', 'component') as EncryptionServiceConfig), algorithm: 'RSA-4096' as const, overheadLatencyMs: 2 });
    const aesRequest = execute(aes, 1, 0, 100);
    expect(execute(chacha, 1, 0, 100).totalLatencyMs).toBeLessThan(aesRequest.totalLatencyMs);
    expect(execute(rsa, 1, 0, 100).totalLatencyMs).toBeGreaterThan(aesRequest.totalLatencyMs);
    expect(aesRequest.path[0].info).toContain('30d key rotation is diagram-only');
    expect(aesRequest.path[0].info).toContain('no encryption or cryptographic security validation is performed');
    expect(aes.getMetricsSnapshot().componentMetrics.component).toMatchObject({ encryptionOperations: 1, encryptedPayloadKb: 100 });
  });
});
