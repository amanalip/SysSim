import type { TrafficConfig } from '../model/types';
import { assertNever } from '../utils/assert-never';
import { SIMULATION_LIMITS } from './simulation-limits';

export function createDefaultTrafficConfig(): TrafficConfig {
  return {
    pattern: 'steady',
    baseQps: 500,
    burstMultiplier: 3,
    rampDurationSec: 30,
    spikeFrequencySec: 10,
    seed: 1,
    requestKeyDistribution: 'uniform',
    requestKeySpaceSize: 100,
  };
}

export function calculateScheduledQps(config: TrafficConfig, elapsedSec: number): number {
  const base = config.baseQps;
  let qps: number;
  switch (config.pattern) {
    case 'bursty':
      qps = Math.floor(elapsedSec / 5) % 2 === 1 ? base * config.burstMultiplier : base;
      break;
    case 'ramp':
      qps = Math.floor(
        base * (0.2 + 0.8 * Math.min(1, elapsedSec / (config.rampDurationSec || 30))),
      );
      break;
    case 'spike':
      qps = Math.floor(elapsedSec) % (config.spikeFrequencySec || 10) === 0 ? base * 5 : base;
      break;
    case 'custom': {
      let entry: NonNullable<TrafficConfig['customSchedule']>[number] | undefined;
      for (let index = (config.customSchedule?.length ?? 0) - 1; index >= 0; index -= 1) {
        const candidate = config.customSchedule?.[index];
        if (candidate && elapsedSec >= candidate.timeSec) {
          entry = candidate;
          break;
        }
      }
      qps = entry?.qps ?? base;
      break;
    }
    case 'steady':
      qps = base;
      break;
    default:
      return assertNever(config.pattern, 'traffic pattern');
  }
  return Number.isFinite(qps) ? Math.min(SIMULATION_LIMITS.maxConfiguredQps, Math.max(0, qps)) : 0;
}
