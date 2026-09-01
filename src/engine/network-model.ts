import { EdgeProtocol } from '../model/types';

export interface NetworkTransferInput {
  protocol: EdgeProtocol;
  baseLatencyMs: number;
  bandwidthMbps?: number;
  requestPayloadKb?: number;
  responsePayloadKb?: number;
  lossRatePercent?: number;
  retryLimit?: number;
  connectionSetupMs?: number;
  keepAlive?: boolean;
  sourceZoneId?: string;
  targetZoneId?: string;
  crossZoneCostPerGb?: number;
}

export interface NetworkTransferResult {
  totalLatencyMs: number;
  propagationLatencyMs: number;
  transferLatencyMs: number;
  protocolOverheadMs: number;
  connectionSetupLatencyMs: number;
  retryLatencyMs: number;
  expectedAttempts: number;
  crossZone: boolean;
  crossZoneLatencyMs: number;
  crossZoneCost: number;
}

export const PROTOCOL_ASSUMPTIONS: Record<
  EdgeProtocol,
  { overheadMs: number; modeledGuarantees: string; evidenceBasis: string }
> = {
  HTTP: {
    overheadMs: 1.5,
    modeledGuarantees: 'request/response timing only',
    evidenceBasis: 'illustrative constant; not benchmark-derived',
  },
  gRPC: {
    overheadMs: 0.7,
    modeledGuarantees: 'framing overhead only',
    evidenceBasis: 'illustrative constant; not benchmark-derived',
  },
  WebSocket: {
    overheadMs: 0.4,
    modeledGuarantees: 'established-channel timing only',
    evidenceBasis: 'illustrative constant; not benchmark-derived',
  },
  TCP: {
    overheadMs: 0.3,
    modeledGuarantees: 'stream transfer timing only',
    evidenceBasis: 'illustrative constant; not benchmark-derived',
  },
  UDP: {
    overheadMs: 0.1,
    modeledGuarantees: 'no delivery or ordering guarantee',
    evidenceBasis: 'illustrative constant; not benchmark-derived',
  },
  MQTT: {
    overheadMs: 0.5,
    modeledGuarantees: 'publish timing; broker semantics are separate',
    evidenceBasis: 'illustrative constant; not benchmark-derived',
  },
  'pub/sub': {
    overheadMs: 0.8,
    modeledGuarantees: 'publish timing; delivery semantics are separate',
    evidenceBasis: 'illustrative constant; not benchmark-derived',
  },
};

export function calculateNetworkTransfer(input: NetworkTransferInput): NetworkTransferResult {
  const payloadKb =
    Math.max(0, input.requestPayloadKb || 0) + Math.max(0, input.responsePayloadKb || 0);
  const bandwidth = Math.max(0, input.bandwidthMbps || 0);
  const transferLatencyMs = bandwidth > 0 ? (payloadKb * 8) / bandwidth : 0;
  const propagationLatencyMs = Math.max(0, input.baseLatencyMs);
  const protocolOverheadMs = PROTOCOL_ASSUMPTIONS[input.protocol].overheadMs;
  const connectionSetupLatencyMs = input.keepAlive ? 0 : Math.max(0, input.connectionSetupMs || 0);
  const loss = Math.min(1, Math.max(0, (input.lossRatePercent || 0) / 100));
  const retries = Math.max(0, Math.floor(input.retryLimit || 0));
  let expectedAttempts = 1;
  let retryProbability = loss;
  for (let retry = 0; retry < retries; retry++) {
    expectedAttempts += retryProbability;
    retryProbability *= loss;
  }
  const oneAttemptMs = propagationLatencyMs + transferLatencyMs + protocolOverheadMs;
  const retryLatencyMs = oneAttemptMs * Math.max(0, expectedAttempts - 1);
  const crossZone = Boolean(
    input.sourceZoneId && input.targetZoneId && input.sourceZoneId !== input.targetZoneId,
  );
  const crossZoneCost = crossZone
    ? (payloadKb / 1_000_000) * Math.max(0, input.crossZoneCostPerGb || 0)
    : 0;
  const crossZoneLatencyMs = crossZone ? 2 : 0;
  return {
    totalLatencyMs: oneAttemptMs + connectionSetupLatencyMs + retryLatencyMs + crossZoneLatencyMs,
    propagationLatencyMs,
    transferLatencyMs,
    protocolOverheadMs,
    connectionSetupLatencyMs,
    retryLatencyMs,
    expectedAttempts,
    crossZone,
    crossZoneLatencyMs,
    crossZoneCost,
  };
}
