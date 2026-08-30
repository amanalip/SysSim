import { SysSimEngine, SimGraph } from './simulator';
import { TrafficConfig } from '../model/types';
import { SIMULATION_LIMITS } from './simulation-limits';

const engine = new SysSimEngine();
let timer: ReturnType<typeof setInterval> | null = null;
let lastTickTime = Date.now();
let graphRevision = 0;

const postTick = (payload: ReturnType<SysSimEngine['step']>) => {
  self.postMessage({ type: 'TICK_UPDATE', payload: { ...payload, graphRevision } });
};

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT_OR_UPDATE_GRAPH':
      engine.setGraph(payload.graph as SimGraph);
      graphRevision = payload.graphRevision;
      break;

    case 'UPDATE_CONFIG':
      engine.setConfig(payload as Partial<TrafficConfig>);
      break;

    case 'SET_SPEED':
      engine.setSpeedMultiplier(payload as number);
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
  }
};
