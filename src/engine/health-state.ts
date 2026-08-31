import { NodeHealthStatus } from '../model/types';

export type HealthStateSource = 'configured' | 'manual' | 'chaos' | 'metrics';

export interface HealthBehavior {
  status: NodeHealthStatus;
  acceptsNewWork: boolean;
  capacityMultiplier: number;
  latencyMultiplier: number;
  addedFailureRatePercent: number;
}

/**
 * Central health contract used by every simulated component category.
 * Health is sampled when work arrives: work admitted before a later state change
 * completes under the state it saw at admission; new work observes the new state.
 */
export const HEALTH_BEHAVIORS: Record<NodeHealthStatus, HealthBehavior> = {
  healthy: {
    status: 'healthy',
    acceptsNewWork: true,
    capacityMultiplier: 1,
    latencyMultiplier: 1,
    addedFailureRatePercent: 0,
  },
  degraded: {
    status: 'degraded',
    acceptsNewWork: true,
    capacityMultiplier: 0.7,
    latencyMultiplier: 1.5,
    addedFailureRatePercent: 5,
  },
  overloaded: {
    status: 'overloaded',
    acceptsNewWork: true,
    capacityMultiplier: 0.5,
    latencyMultiplier: 2,
    addedFailureRatePercent: 10,
  },
  down: {
    status: 'down',
    acceptsNewWork: false,
    capacityMultiplier: 0,
    latencyMultiplier: 1,
    addedFailureRatePercent: 100,
  },
};

export function deriveHealthFromCapacity(
  configured: NodeHealthStatus,
  arrivalsThisSecond: number,
  maxThroughputQps?: number,
): NodeHealthStatus {
  if (configured !== 'healthy') return configured;
  if (!maxThroughputQps || maxThroughputQps <= 0) return configured;
  return arrivalsThisSecond > maxThroughputQps ? 'overloaded' : configured;
}

export function getHealthBehavior(status: NodeHealthStatus): HealthBehavior {
  return HEALTH_BEHAVIORS[status];
}

export const HEALTH_RECOVERY_CONTRACT =
  'Health changes affect new arrivals immediately. Already-admitted synchronous work completes with its admission-time state; load-balancer targets recover only after their configured health-check and recovery delay.';
