import { SysSimEngine, SimGraph } from './simulator';
import { TrafficConfig } from '../model/types';
import { SIMULATION_LIMITS } from './simulation-limits';
import { isWorkerCommand, WorkerResponse } from './worker-protocol';

const engine = new SysSimEngine();
let timer: ReturnType<typeof setInterval> | null = null;
let lastTickTime = Date.now();
let graphRevision = 0;

const postTick = (payload: ReturnType<SysSimEngine['step']>, stepCpuMs = 0) => {
  const message: WorkerResponse = {
    type: 'TICK_UPDATE',
    payload: {
      ...payload,
      graphRevision,
      performance: { stepCpuMs, messageBytes: 0 },
    },
  };
  const serializedBytes = new TextEncoder().encode(JSON.stringify(message)).byteLength;
  if (message.type === 'TICK_UPDATE' && message.payload.performance)
    message.payload.performance.messageBytes = serializedBytes;
  self.postMessage(message);
};

const stepWithTiming = (deltaMs: number) => {
  const startedAt = performance.now();
  const result = engine.step(deltaMs);
  postTick(result, performance.now() - startedAt);
};

self.onmessage = (event: MessageEvent) => {
  if (!isWorkerCommand(event.data)) return;
  const message = event.data;

  switch (message.type) {
    case 'INIT_OR_UPDATE_GRAPH':
      engine.setGraph(message.payload.graph as SimGraph);
      graphRevision = message.payload.graphRevision;
      self.postMessage({ type: 'GRAPH_ACK', payload: { graphRevision } } satisfies WorkerResponse);
      break;

    case 'UPDATE_CONFIG':
      engine.setConfig(message.payload as Partial<TrafficConfig>);
      break;

    case 'SET_SPEED':
      engine.setSpeedMultiplier(message.payload as number);
      break;

    case 'START':
      engine.start();
      lastTickTime = Date.now();
      if (!timer) {
        timer = setInterval(() => {
          const now = Date.now();
          const delta = now - lastTickTime;
          lastTickTime = now;
          stepWithTiming(delta);
        }, SIMULATION_LIMITS.uiUpdateIntervalMs);
      }
      break;

    case 'PAUSE':
      engine.pause();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      break;

    case 'RESUME':
      engine.resume();
      lastTickTime = Date.now();
      if (!timer) {
        timer = setInterval(() => {
          const now = Date.now();
          const delta = now - lastTickTime;
          lastTickTime = now;
          stepWithTiming(delta);
        }, SIMULATION_LIMITS.uiUpdateIntervalMs);
      }
      break;

    case 'STEP':
      engine.start();
      const stepStartedAt = performance.now();
      const stepResult = engine.step(100);
      engine.pause();
      postTick(stepResult, performance.now() - stepStartedAt);
      break;

    case 'STOP':
      engine.stop();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      break;

    case 'RESET':
      engine.reset();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      self.postMessage({
        type: 'TICK_UPDATE',
        payload: {
          metrics: engine.getMetricsSnapshot(),
          activeRequests: [],
          recentRequests: [],
          graphRevision,
        },
      });
      break;

    case 'DISPOSE':
      if (timer) clearInterval(timer);
      timer = null;
      self.close();
      break;
  }
};

self.postMessage({ type: 'WORKER_READY' } satisfies WorkerResponse);
