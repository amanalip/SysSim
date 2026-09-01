import type { TrafficConfig } from '../model/types';
import type { SimGraph } from './simulator';
import { SIMULATION_LIMITS } from './simulation-limits';

const clamp = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
const clampOptional = (value: unknown, min: number, max: number): number | undefined =>
  value === undefined ? undefined : clamp(value, min, max, min);

export function clampTrafficConfig(
  current: TrafficConfig,
  patch: Partial<TrafficConfig>,
): TrafficConfig {
  const merged = { ...current, ...patch };
  return {
    ...merged,
    baseQps: clamp(merged.baseQps, 0, SIMULATION_LIMITS.maxConfiguredQps, current.baseQps),
    burstMultiplier: clamp(merged.burstMultiplier, 0, 100, current.burstMultiplier),
    rampDurationSec: clamp(merged.rampDurationSec, 0.1, 86_400, current.rampDurationSec),
    spikeFrequencySec: clamp(merged.spikeFrequencySec, 0.1, 86_400, current.spikeFrequencySec),
    seed: Math.round(clamp(merged.seed, 1, 0xffff_ffff, current.seed || 1)),
    requestKeySpaceSize: Math.round(
      clamp(merged.requestKeySpaceSize, 1, 1_000_000, current.requestKeySpaceSize || 10_000),
    ),
    customSchedule: merged.customSchedule
      ?.slice(0, SIMULATION_LIMITS.maxCustomScheduleEntries)
      .map((entry) => ({
        timeSec: clamp(entry.timeSec, 0, 86_400, 0),
        qps: clamp(entry.qps, 0, SIMULATION_LIMITS.maxConfiguredQps, 0),
      }))
      .sort((a, b) => a.timeSec - b.timeSec),
    customRequestKeys: merged.customRequestKeys
      ?.slice(0, SIMULATION_LIMITS.maxCustomRequestKeys)
      .map((entry) => ({
        key: String(entry.key).slice(0, 120),
        weight: clamp(entry.weight, 0, 1_000_000, 0),
      })),
    requestPayloadMinKb: clampOptional(merged.requestPayloadMinKb, 0, 1_000_000),
    requestPayloadMaxKb: clampOptional(merged.requestPayloadMaxKb, 0, 1_000_000),
    responsePayloadMinKb: clampOptional(merged.responsePayloadMinKb, 0, 1_000_000),
    responsePayloadMaxKb: clampOptional(merged.responsePayloadMaxKb, 0, 1_000_000),
    warmUpSec: clampOptional(merged.warmUpSec, 0, 86_400),
    measurementDurationSec: clampOptional(merged.measurementDurationSec, 0, 86_400),
    workloadTrace: merged.workloadTrace
      ?.slice(0, SIMULATION_LIMITS.maxCustomScheduleEntries)
      .map((entry) => ({
        timeSec: clamp(entry.timeSec, 0, 86_400, 0),
        qps: clamp(entry.qps, 0, SIMULATION_LIMITS.maxConfiguredQps, 0),
        operation: entry.operation,
        requestPayloadKb: clamp(entry.requestPayloadKb, 0, 1_000_000, 0),
        responsePayloadKb: clamp(entry.responsePayloadKb, 0, 1_000_000, 0),
      }))
      .sort((a, b) => a.timeSec - b.timeSec),
  };
}

export function clampSimGraph(graph: SimGraph): SimGraph {
  const nodes = graph.nodes.slice(0, SIMULATION_LIMITS.maxNodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, SIMULATION_LIMITS.maxEdges);
  return { nodes, edges };
}

export function clampStepDelta(deltaMs: number): number {
  return clamp(deltaMs, 0, SIMULATION_LIMITS.maxStepDeltaMs, 0);
}

export function clampSpeedMultiplier(multiplier: number): number {
  return clamp(
    multiplier,
    SIMULATION_LIMITS.minSpeedMultiplier,
    SIMULATION_LIMITS.maxSpeedMultiplier,
    1,
  );
}
