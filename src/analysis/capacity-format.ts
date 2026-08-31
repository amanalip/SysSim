import type { EstimateRange } from '../model/types';

export function formatCapacityNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

export function formatCapacityRange(range: EstimateRange, unit: string): string {
  return `${formatCapacityNumber(range.low)}–${formatCapacityNumber(range.high)} ${unit}`;
}
