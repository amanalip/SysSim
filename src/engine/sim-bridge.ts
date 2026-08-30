import { useStore } from '../store/use-store';
import { SimGraph, SysSimEngine } from './simulator';
import { TrafficConfig } from '../model/types';
import { SIMULATION_LIMITS } from './simulation-limits';

export function isCurrentGraphRevision(resultRevision: number, currentRevision: number): boolean {
  return Number.isInteger(resultRevision) && resultRevision === currentRevision;
}

export function createGraphUpdateMessage(graph: SimGraph, graphRevision: number) {
  return { type: 'INIT_OR_UPDATE_GRAPH', payload: { graph, graphRevision } } as const;
}

class SimulationBridge {
  private worker: Worker | null = null;
  private fallbackEngine: SysSimEngine | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private isWorkerSupported: boolean;

  constructor() {
    this.isWorkerSupported = typeof Worker !== 'undefined';
    this.init();
  }

  private init(): void {
    if (this.isWorkerSupported) {
      try {
        this.worker = new Worker(
          new URL('./sim-worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event) => {
          const { type, payload } = event.data;
          if (type === 'TICK_UPDATE' && payload) {
            const { metrics, activeRequests, recentRequests, graphRevision } = payload;
            if (!isCurrentGraphRevision(graphRevision, useStore.getState().graphRevision)) return;
            useStore.getState().updateMetrics(metrics);
            useStore.getState().setActiveRequests(activeRequests || []);
            useStore.getState().setRecentRequests(recentRequests || []);
          }
        };

        this.worker.onerror = (err) => {
          console.warn('Simulation Web Worker encountered an error, failing over to main thread engine:', err);
          try {
            this.worker?.terminate();
          } catch {}
          this.worker = null;
          this.fallbackEngine = new SysSimEngine();
          this.syncGraph();
          this.syncConfig(useStore.getState().trafficConfig);
          this.setSpeed(useStore.getState().speedMultiplier);
          if (useStore.getState().simState === 'running') {
            this.start();
          }
        };
      } catch (err) {
        console.warn('Web Worker initialization failed, using main thread fallback', err);
        this.worker = null;
        this.fallbackEngine = new SysSimEngine();
      }
    } else {
      this.fallbackEngine = new SysSimEngine();
    }
  }

  public syncGraph(): void {
    const { nodes, edges, graphRevision } = useStore.getState();
    const simGraph: SimGraph = {
      nodes: nodes.map((n) => ({ id: n.id, config: n.data.config })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data,
      })),
    };

    if (this.worker) {
      this.worker.postMessage(createGraphUpdateMessage(simGraph, graphRevision));
    } else if (this.fallbackEngine) {
      this.fallbackEngine.setGraph(simGraph);
    }
  }

  public syncConfig(config: Partial<TrafficConfig>): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'UPDATE_CONFIG', payload: config });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.setConfig(config);
    }
  }

  public setSpeed(multiplier: number): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'SET_SPEED', payload: multiplier });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.setSpeedMultiplier(multiplier);
    }
  }

  public start(): void {
    this.syncGraph();
    this.syncConfig(useStore.getState().trafficConfig);
    this.setSpeed(useStore.getState().speedMultiplier);
    useStore.getState().setSimState('running');

    if (this.worker) {
      this.worker.postMessage({ type: 'START' });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.start();
      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
      let lastTime = Date.now();
      this.fallbackTimer = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTime;
        lastTime = now;
        if (this.fallbackEngine) {
          const result = this.fallbackEngine.step(delta);
          useStore.getState().updateMetrics(result.metrics);
          useStore.getState().setActiveRequests(result.activeRequests);
          useStore.getState().setRecentRequests(result.recentRequests);
        }
      }, SIMULATION_LIMITS.uiUpdateIntervalMs);
    }
  }

  public pause(): void {
    useStore.getState().setSimState('paused');
    if (this.worker) {
      this.worker.postMessage({ type: 'PAUSE' });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.pause();
      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
    }
  }

  public resume(): void {
    this.syncGraph();
    useStore.getState().setSimState('running');
    if (this.worker) {
      this.worker.postMessage({ type: 'RESUME' });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.resume();
      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
      let lastTime = Date.now();
      this.fallbackTimer = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTime;
        lastTime = now;
        if (this.fallbackEngine) {
          const result = this.fallbackEngine.step(delta);
          useStore.getState().updateMetrics(result.metrics);
          useStore.getState().setActiveRequests(result.activeRequests);
          useStore.getState().setRecentRequests(result.recentRequests);
        }
      }, SIMULATION_LIMITS.uiUpdateIntervalMs);
    }
  }

  public step(): void {
    this.syncGraph();
    if (this.worker) {
      this.worker.postMessage({ type: 'STEP' });
    } else if (this.fallbackEngine) {
      const res = this.fallbackEngine.step(100);
      useStore.getState().updateMetrics(res.metrics);
      useStore.getState().setActiveRequests(res.activeRequests);
      useStore.getState().setRecentRequests(res.recentRequests);
    }
  }

  public stop(): void {
    useStore.getState().setSimState('stopped');
    if (this.worker) {
      this.worker.postMessage({ type: 'STOP' });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.stop();
      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
    }
  }

  public reset(): void {
    useStore.getState().resetSimulation();
    if (this.worker) {
      this.worker.postMessage({ type: 'RESET' });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.reset();
      if (this.fallbackTimer) {
        clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
    }
  }
}

export const simBridge = new SimulationBridge();
