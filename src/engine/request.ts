import { ComponentType, NodeHealthStatus, SimRequest } from '../model/types';

export function createSimRequest(
  sourceNodeId: string,
  timestampMs: number = Date.now(),
  requestKey: string = 'resource:0',
  requestSequence?: number,
): SimRequest {
  const id = requestSequence === undefined
    ? `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    : `req_${requestSequence}`;
  return {
    id,
    timestamp: timestampMs,
    sourceNodeId,
    requestKey,
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
