import { ComponentType, NodeHealthStatus, SimRequest } from '../model/types';

export function createSimRequest(
  sourceNodeId: string,
  timestampMs: number = Date.now()
): SimRequest {
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    timestamp: timestampMs,
    sourceNodeId,
    path: [],
    totalLatencyMs: 0,
    status: 'in_flight',
    color: '#58a6ff',
  };
}

export interface EngineHopRecord {
  nodeId: string;
  nodeName: string;
  nodeType: ComponentType;
  health: NodeHealthStatus;
  latencyMs: number;
  status: 'hit' | 'miss' | 'processed' | 'rejected' | 'queued' | 'error';
  info?: string;
}
