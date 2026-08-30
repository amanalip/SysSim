import { SysSimEngine, SimGraph } from './simulator';
import { TrafficConfig } from '../model/types';
import { SIMULATION_LIMITS } from './simulation-limits';
import { isWorkerCommand, WorkerResponse } from './worker-protocol';

const engine = new SysSimEngine();
let timer: ReturnType<typeof setInterval> | null = null;
let lastTickTime = Date.now();
let graphRevision = 0;

const postTick = (payload: ReturnType<SysSimEngine['step']>) => {
  const message: WorkerResponse = { type: 'TICK_UPDATE', payload: { ...payload, graphRevision } };
  self.postMessage(message);
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
          const result = engine.step(delta);
          postTick(result);
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
          const result = engine.step(delta);
          postTick(result);
        }, SIMULATION_LIMITS.uiUpdateIntervalMs);
      }
      break;

    case 'STEP':
      engine.start();
      const stepResult = engine.step(100);
      engine.pause();
      postTick(stepResult);
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
