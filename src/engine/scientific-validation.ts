export function mm1Reference(
  arrivalRate: number,
  serviceRate: number,
): {
  utilization: number;
  meanSystemTimeSec: number;
  meanQueueDepth: number;
} {
  if (arrivalRate < 0 || serviceRate <= 0 || arrivalRate >= serviceRate)
    throw new Error('M/M/1 reference requires 0 <= arrival rate < service rate');
  const utilization = arrivalRate / serviceRate;
  return {
    utilization,
    meanSystemTimeSec: 1 / (serviceRate - arrivalRate),
    meanQueueDepth: utilization ** 2 / (1 - utilization),
  };
}

export function nearestRank(values: readonly number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(Math.min(1, Math.max(0, percentile)) * sorted.length));
  return sorted[rank - 1];
}

export function relativeError(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.abs(actual - expected) / Math.abs(expected);
}

export const SCIENTIFIC_TOLERANCES = {
  deterministicSchedule: 0,
  loadBalancerShare: 0.03,
  seededCacheHitRatio: 0.05,
  queueApproximation: 0.2,
} as const;
