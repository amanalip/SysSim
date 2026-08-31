import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../model/component-defaults';
import { ComponentCategory, ComponentType, SimRequest, TrafficConfig } from '../model/types';
import {
  deriveHealthFromCapacity,
  getHealthBehavior,
  HEALTH_RECOVERY_CONTRACT,
} from '../engine/health-state';
import { SysSimEngine } from '../engine/simulator';
import { createSimRequest } from '../engine/request';

const traffic: TrafficConfig = {
  pattern: 'steady',
  baseQps: 0,
  burstMultiplier: 1,
  rampDurationSec: 1,
  spikeFrequencySec: 1,
  seed: 71,
};
const representative: Record<ComponentCategory, ComponentType> = {
  compute: 'app_server',
  networking: 'load_balancer',
  storage: 'sql_db',
  caching: 'redis_cache',
  messaging: 'message_queue',
  security: 'auth_service',
};

describe('health-state tasks 152-159', () => {
  it('defines one behavior contract for every health state', () => {
    expect(getHealthBehavior('healthy')).toMatchObject({
      capacityMultiplier: 1,
      latencyMultiplier: 1,
      acceptsNewWork: true,
    });
    expect(getHealthBehavior('degraded')).toMatchObject({
      capacityMultiplier: 0.7,
      latencyMultiplier: 1.5,
      addedFailureRatePercent: 5,
    });
    expect(getHealthBehavior('overloaded')).toMatchObject({
      capacityMultiplier: 0.5,
      latencyMultiplier: 2,
      addedFailureRatePercent: 10,
    });
    expect(getHealthBehavior('down').acceptsNewWork).toBe(false);
    expect(HEALTH_RECOVERY_CONTRACT).toContain('Already-admitted');
  });

  it('derives overload only when measured arrivals exceed configured capacity', () => {
    expect(deriveHealthFromCapacity('healthy', 10, 10)).toBe('healthy');
    expect(deriveHealthFromCapacity('healthy', 11, 10)).toBe('overloaded');
    expect(deriveHealthFromCapacity('degraded', 11, 10)).toBe('degraded');
  });

  it.each(Object.entries(representative))(
    '%s components reject work while down',
    (_category, type) => {
      const config = { ...createDefaultConfig(type, 'target'), health: 'down' as const };
      const engine = new SysSimEngine({ nodes: [{ id: 'target', config }], edges: [] }, traffic);
      const request = createSimRequest('target', 0, 'key', 1);
      (engine as unknown as { processRequest: (request: SimRequest) => void }).processRequest(
        request,
      );
      expect(request.status).toBe('error');
      expect(engine.getMetricsSnapshot().componentMetrics.target.effectiveHealth).toBe('down');
    },
  );
});
