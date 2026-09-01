import { AnyComponentConfig } from '../model/types';

export function boundedExponentialBackoff(
  baseDelayMs: number,
  attempt: number,
  random: () => number,
  options: { maxDelayMs?: number; jitterPercent?: number } = {},
): number {
  const ceiling = Math.max(0, options.maxDelayMs ?? 30_000);
  const exponential = Math.min(ceiling, Math.max(0, baseDelayMs) * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.min(1, Math.max(0, (options.jitterPercent ?? 20) / 100));
  return exponential * (1 - jitter + random() * jitter * 2);
}

export class BulkheadModel {
  private active = new Map<string, number>();

  public constructor(private readonly capacities: Readonly<Record<string, number>>) {}

  public acquire(pool: string): boolean {
    const capacity = Math.max(0, Math.floor(this.capacities[pool] || 0));
    const active = this.active.get(pool) || 0;
    if (active >= capacity) return false;
    this.active.set(pool, active + 1);
    return true;
  }

  public release(pool: string): void {
    this.active.set(pool, Math.max(0, (this.active.get(pool) || 0) - 1));
  }
}

export function evaluateQuorum(
  availableReplicas: number,
  readQuorum: number,
  writeQuorum: number,
): { canRead: boolean; canWrite: boolean } {
  const available = Math.max(0, Math.floor(availableReplicas));
  return {
    canRead: available >= Math.max(1, Math.floor(readQuorum)),
    canWrite: available >= Math.max(1, Math.floor(writeQuorum)),
  };
}

export function applyZoneFailure<
  T extends { zoneId?: string; health: AnyComponentConfig['health'] },
>(components: readonly T[], failedZoneId: string): T[] {
  return components.map((component) =>
    component.zoneId === failedZoneId ? { ...component, health: 'down' } : { ...component },
  );
}

export function calculateRetryAmplification(input: {
  initialRequests: number;
  failureRatePercent: number;
  retryLimit: number;
  queueCapacity: number;
}): {
  attemptedRequests: number;
  amplificationFactor: number;
  queuedRequests: number;
  droppedRequests: number;
} {
  const initial = Math.max(0, input.initialRequests);
  const failure = Math.min(1, Math.max(0, input.failureRatePercent / 100));
  let attempted = initial;
  let retrying = initial * failure;
  for (let retry = 0; retry < Math.max(0, Math.floor(input.retryLimit)); retry++) {
    attempted += retrying;
    retrying *= failure;
  }
  const queuedRequests = Math.min(attempted, Math.max(0, input.queueCapacity));
  return {
    attemptedRequests: attempted,
    amplificationFactor: initial > 0 ? attempted / initial : 0,
    queuedRequests,
    droppedRequests: Math.max(0, attempted - queuedRequests),
  };
}
