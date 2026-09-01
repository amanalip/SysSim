import { createDefaultConfig } from '../model/component-defaults';
import { createSimRequest } from './request';
import { SimGraph, SysSimEngine } from './simulator';

export const SINGLE_PATH_REFERENCE = Object.freeze({
  payloadKb: 2,
  clientLatencyMs: 2,
  appProcessingMs: 15,
  edgeLatencyMs: 10,
  transferMsAtDefaultBandwidth: 0.02,
  expectedEndToEndLatencyMs: 27.02,
});

export function createSinglePathReferenceEngine(): {
  engine: SysSimEngine;
  graph: SimGraph;
} {
  const client = {
    ...createDefaultConfig('client', 'reference-client'),
    requestPayloadKb: SINGLE_PATH_REFERENCE.payloadKb,
  };
  const app = {
    ...createDefaultConfig('app_server', 'reference-app'),
    processingLatencyMs: SINGLE_PATH_REFERENCE.appProcessingMs,
  };
  const graph: SimGraph = {
    nodes: [
      { id: client.id, config: client },
      { id: app.id, config: app },
    ],
    edges: [
      {
        id: 'reference-edge',
        source: client.id,
        target: app.id,
        data: { protocol: 'HTTP', purpose: 'request', latencyMs: 10 },
      },
    ],
  };
  return { engine: new SysSimEngine(graph), graph };
}

export function runSinglePathReference(): number {
  const { engine } = createSinglePathReferenceEngine();
  const request = createSimRequest('reference-client', 0, 'reference-key', 1, {
    payloadSizeKb: SINGLE_PATH_REFERENCE.payloadKb,
    simulationSeed: 1,
  });
  engine.processRequest(request);
  return request.totalLatencyMs;
}
