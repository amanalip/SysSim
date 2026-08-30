import { AnyComponentConfig } from '../../model/types';

export function effectiveCapacityQps(config: AnyComponentConfig): number {
  const base = Math.max(0, config.maxThroughputQps || 0);
  const replicas = 'replicas' in config ? Math.max(1, Math.floor(Number(config.replicas) || 1)) : 1;
  return base * replicas;
}

export function capacityUtilizationPercent(config: AnyComponentConfig, qps: number): number {
  const capacity = effectiveCapacityQps(config);
  return capacity > 0 ? Math.min(100, Math.round((Math.max(0, qps) / capacity) * 1000) / 10) : 0;
}
