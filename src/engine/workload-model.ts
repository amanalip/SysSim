import {
  PayloadDistribution,
  TrafficConfig,
  WorkloadOperation,
  WorkloadTracePoint,
} from '../model/types';
import { ARCHITECTURE_LIMITS } from '../model/architecture-schema';

export interface WorkloadSample {
  operation: WorkloadOperation;
  requestPayloadKb: number;
  responsePayloadKb: number;
}

const OPERATIONS: WorkloadOperation[] = ['read', 'write', 'compute', 'message'];

function samplePayload(
  distribution: PayloadDistribution,
  min: number,
  max: number,
  random: () => number,
): number {
  const lower = Math.max(0, Math.min(min, max));
  const upper = Math.max(lower, max);
  if (distribution === 'fixed' || lower === upper) return upper;
  if (distribution === 'uniform') return lower + random() * (upper - lower);
  const normal =
    Math.sqrt(-2 * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(2 * Math.PI * random());
  const normalized = Math.min(1, Math.max(0, 0.5 + normal / 6));
  return lower * (upper / Math.max(lower, 0.001)) ** normalized;
}

function weightedOperation(
  mix: TrafficConfig['operationMix'],
  random: () => number,
): WorkloadOperation {
  const weights = OPERATIONS.map((operation) => Math.max(0, mix?.[operation] || 0));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return 'read';
  let cursor = random() * total;
  for (let index = 0; index < OPERATIONS.length; index++) {
    cursor -= weights[index];
    if (cursor <= 0) return OPERATIONS[index];
  }
  return OPERATIONS[OPERATIONS.length - 1];
}

export function getWorkloadTracePoint(
  trace: readonly WorkloadTracePoint[] | undefined,
  elapsedSec: number,
): WorkloadTracePoint | undefined {
  let selected: WorkloadTracePoint | undefined;
  for (const point of trace || []) {
    if (point.timeSec > elapsedSec) break;
    selected = point;
  }
  return selected;
}

export function sampleWorkload(
  config: TrafficConfig,
  elapsedSec: number,
  random: () => number,
  fixedRequestPayloadKb = 2,
): WorkloadSample {
  const trace = getWorkloadTracePoint(config.workloadTrace, elapsedSec);
  const distribution = config.payloadDistribution || 'fixed';
  return {
    operation: trace?.operation || weightedOperation(config.operationMix, random),
    requestPayloadKb:
      trace?.requestPayloadKb ??
      samplePayload(
        distribution,
        config.requestPayloadMinKb ?? fixedRequestPayloadKb,
        config.requestPayloadMaxKb ?? fixedRequestPayloadKb,
        random,
      ),
    responsePayloadKb:
      trace?.responsePayloadKb ??
      samplePayload(
        distribution,
        config.responsePayloadMinKb ?? 0,
        config.responsePayloadMaxKb ?? 0,
        random,
      ),
  };
}

export function getMeasurementPhase(
  config: TrafficConfig,
  elapsedSec: number,
): 'warm-up' | 'measurement' | 'complete' {
  const warmUp = Math.max(0, config.warmUpSec || 0);
  if (elapsedSec < warmUp) return 'warm-up';
  const duration = Math.max(0, config.measurementDurationSec || 0);
  return duration > 0 && elapsedSec >= warmUp + duration ? 'complete' : 'measurement';
}

export function parseBoundedWorkloadTrace(text: string): WorkloadTracePoint[] {
  if (new TextEncoder().encode(text).byteLength > ARCHITECTURE_LIMITS.maxImportBytes)
    throw new Error('Workload trace exceeds the import byte limit');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const rows = text.trim().split(/\r?\n/);
    raw = rows.slice(1).map((row) => {
      const [timeSec, qps, operation, requestPayloadKb, responsePayloadKb] = row.split(',');
      return {
        timeSec: Number(timeSec),
        qps: Number(qps),
        operation: operation || undefined,
        requestPayloadKb: requestPayloadKb ? Number(requestPayloadKb) : undefined,
        responsePayloadKb: responsePayloadKb ? Number(responsePayloadKb) : undefined,
      };
    });
  }
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 1_000)
    throw new Error('Workload trace must contain 1 to 1000 points');
  const points = raw.map((value, index) => {
    if (!value || typeof value !== 'object') throw new Error(`Trace row ${index + 1} is invalid`);
    const point = value as Partial<WorkloadTracePoint>;
    if (!Number.isFinite(point.timeSec) || !Number.isFinite(point.qps))
      throw new Error(`Trace row ${index + 1} requires numeric timeSec and qps`);
    if (point.operation && !OPERATIONS.includes(point.operation))
      throw new Error(`Trace row ${index + 1} has an unsupported operation`);
    return {
      timeSec: Math.max(0, point.timeSec!),
      qps: Math.min(50_000, Math.max(0, point.qps!)),
      operation: point.operation,
      requestPayloadKb: Math.max(0, point.requestPayloadKb || 0),
      responsePayloadKb: Math.max(0, point.responsePayloadKb || 0),
    };
  });
  return points.sort((a, b) => a.timeSec - b.timeSec);
}
