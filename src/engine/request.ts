import { ComponentType, NodeHealthStatus, SimRequest } from '../model/types';

interface RequestInputs {
  payloadSizeKb?: number;
  operationType?: 'read' | 'write';
}

export function createSimRequest(
  sourceNodeId: string,
  timestampMs: number = Date.now(),
  requestKey: string = 'resource:0',
  requestSequence?: number,
  inputs: RequestInputs = {},
): SimRequest {
  const id = requestSequence === undefined
    ? `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    : `req_${requestSequence}`;
  return {
    id,
    timestamp: timestampMs,
    sourceNodeId,
    requestKey,
    payloadSizeKb: inputs.payloadSizeKb,
    operationType: inputs.operationType,
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
