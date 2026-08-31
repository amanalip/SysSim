import { OverallMetrics, SimRequest, TrafficConfig } from '../model/types';
import { SimGraph } from './simulator';

export type WorkerCommand =
  | { type: 'INIT_OR_UPDATE_GRAPH'; payload: { graph: SimGraph; graphRevision: number } }
  | { type: 'UPDATE_CONFIG'; payload: Partial<TrafficConfig> }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'START' | 'PAUSE' | 'RESUME' | 'STEP' | 'STOP' | 'RESET' | 'DISPOSE' };

export interface TickPayload {
  metrics: OverallMetrics;
  activeRequests: SimRequest[];
  recentRequests: SimRequest[];
  graphRevision: number;
}

export type WorkerResponse =
  | { type: 'WORKER_READY' }
  | { type: 'GRAPH_ACK'; payload: { graphRevision: number } }
  | { type: 'TICK_UPDATE'; payload: TickPayload };

export function isWorkerCommand(value: unknown): value is WorkerCommand {
  if (!value || typeof value !== 'object' || typeof (value as { type?: unknown }).type !== 'string')
    return false;
  const message = value as { type: string; payload?: unknown };
  if (['START', 'PAUSE', 'RESUME', 'STEP', 'STOP', 'RESET', 'DISPOSE'].includes(message.type))
    return true;
  if (message.type === 'SET_SPEED')
    return typeof message.payload === 'number' && Number.isFinite(message.payload);
  if (message.type === 'UPDATE_CONFIG')
    return Boolean(message.payload && typeof message.payload === 'object');
  if (message.type === 'INIT_OR_UPDATE_GRAPH') {
    const payload = message.payload as { graph?: SimGraph; graphRevision?: number } | undefined;
    return Boolean(
      payload &&
      Number.isInteger(payload.graphRevision) &&
      payload.graph &&
      Array.isArray(payload.graph.nodes) &&
      Array.isArray(payload.graph.edges),
    );
  }
  return false;
}

export function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (!value || typeof value !== 'object') return false;
  const message = value as { type?: unknown; payload?: unknown };
  if (message.type === 'WORKER_READY') return true;
  if (message.type === 'GRAPH_ACK') {
    return Number.isInteger(
      (message.payload as { graphRevision?: unknown } | undefined)?.graphRevision,
    );
  }
  if (message.type !== 'TICK_UPDATE' || !message.payload || typeof message.payload !== 'object')
    return false;
  const payload = message.payload as Partial<TickPayload>;
  return (
    Number.isInteger(payload.graphRevision) &&
    Boolean(payload.metrics) &&
    Array.isArray(payload.activeRequests) &&
    Array.isArray(payload.recentRequests)
  );
}
