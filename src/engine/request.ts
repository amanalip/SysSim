import { ComponentType, NodeHealthStatus, SimRequest } from '../model/types';

interface RequestInputs {
  payloadSizeKb?: number;
  operationType?: 'read' | 'write';
  simulationSeed?: number;
}

let fallbackRequestSequence = 0;

export function createSimRequest(
  sourceNodeId: string,
  timestampMs: number = Date.now(),
  requestKey: string = 'resource:0',
  requestSequence?: number,
  inputs: RequestInputs = {},
): SimRequest {
  const id =
    requestSequence === undefined
      ? `req_manual_${fallbackRequestSequence++}`
      : `req_${requestSequence}`;
  return {
    id,
    timestamp: timestampMs,
    sourceNodeId,
    requestKey,
    payloadSizeKb: inputs.payloadSizeKb,
    operationType: inputs.operationType,
    simulationSeed: inputs.simulationSeed,
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
