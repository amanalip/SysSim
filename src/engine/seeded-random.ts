export function normalizeSeed(seed: number): number {
  const normalized = Math.floor(Number.isFinite(seed) ? seed : 1) >>> 0;
  return normalized || 1;
}

/** Mulberry32 PRNG. One instance is owned by each simulation run. */
export class SeededRandom {
  private state: number;
  constructor(public readonly seed: number) {
    this.state = normalizeSeed(seed);
  }
  public next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  public reset(): void {
    this.state = normalizeSeed(this.seed);
  }
}

export function createRandom(seed = 1): () => number {
  const generator = new SeededRandom(seed);
  return () => generator.next();
}
