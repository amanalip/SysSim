export interface TimestampFormatOptions {
  locale?: string;
  timeZone?: string;
}

export function monotonicNowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function formatTimestamp(
  epochMs: number,
  { locale = 'en-US', timeZone = 'UTC' }: TimestampFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone,
  }).format(new Date(epochMs));
}

export function formatUtcDateForFilename(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function formatSimulationDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export class SemanticSequence {
  private lastWallTime = Number.NEGATIVE_INFINITY;
  private sequence = 0;

  public next(wallTimeMs = Date.now()): { wallTimeMs: number; sequence: number } {
    if (wallTimeMs === this.lastWallTime) this.sequence += 1;
    else {
      this.lastWallTime = wallTimeMs;
      this.sequence = 0;
    }
    return { wallTimeMs, sequence: this.sequence };
  }
}

let lastOrderedWallTimeMs = Number.NEGATIVE_INFINITY;

/** Produces a strictly increasing wall timestamp for persisted sort order. */
export function nextOrderedWallTimeMs(wallTimeMs = Date.now()): number {
  lastOrderedWallTimeMs = Math.max(wallTimeMs, lastOrderedWallTimeMs + 1);
  return lastOrderedWallTimeMs;
}
