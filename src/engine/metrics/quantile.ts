/** Nearest-rank quantile: sorted[ceil(p * n) - 1], clamped for p=0 and empty input. */
export function nearestRankQuantile(sortedValues: readonly number[], probability: number): number {
  if (!sortedValues.length) return 0;
  const p = Math.min(1, Math.max(0, probability));
  const rank = Math.max(1, Math.ceil(p * sortedValues.length));
  return sortedValues[Math.min(sortedValues.length - 1, rank - 1)];
}
