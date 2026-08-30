import { OverallMetrics, SimRequest, SimulationState, TrafficConfig } from '../model/types';
import { SimGraph, SysSimEngine } from './simulator';
import { SIMULATION_LIMITS } from './simulation-limits';
import { isWorkerResponse, TickPayload, WorkerCommand } from './worker-protocol';

export type SimulationRuntimeMode = 'worker' | 'fallback';

export interface SimulationBridgeSnapshot {
  graph: SimGraph;
  graphRevision: number;
  trafficConfig: TrafficConfig;
  speedMultiplier: number;
  simState: SimulationState;
}

export interface SimulationBridgeEvents {
  onTick: (payload: TickPayload) => void;
  onStateChange: (state: SimulationState) => void;
  onModeChange: (mode: SimulationRuntimeMode) => void;
  onReset: () => void;
}

interface WorkerPort {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerCommand): void;
  terminate(): void;
}

export interface SimulationBridgeOptions {
  workerFactory?: () => WorkerPort;
  engineFactory?: () => SysSimEngine;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
  now?: () => number;
}

export function isCurrentGraphRevision(resultRevision: number, currentRevision: number): boolean {
  return Number.isInteger(resultRevision) && resultRevision === currentRevision;
}

export function createGraphUpdateMessage(graph: SimGraph, graphRevision: number): WorkerCommand {
  return { type: 'INIT_OR_UPDATE_GRAPH', payload: { graph, graphRevision } };
}

export class SimulationBridge {
  private worker: WorkerPort | null = null;
  private fallbackEngine: SysSimEngine | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private workerReady = false;
  private acknowledgedGraphRevision = -1;
  private pendingStart = false;
  private mode: SimulationRuntimeMode = 'fallback';
  private readonly engineFactory: () => SysSimEngine;
  private readonly setIntervalFn: typeof setInterval;
  private readonly clearIntervalFn: typeof clearInterval;
  private readonly now: () => number;

  public constructor(
    private readonly getSnapshot: () => SimulationBridgeSnapshot,
    private readonly events: SimulationBridgeEvents,
    private readonly options: SimulationBridgeOptions = {},
  ) {
    this.engineFactory = options.engineFactory || (() => new SysSimEngine());
    this.setIntervalFn = options.setIntervalFn || setInterval;
    this.clearIntervalFn = options.clearIntervalFn || clearInterval;
    this.now = options.now || Date.now;
  }

  public initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    const factory = this.options.workerFactory || this.defaultWorkerFactory();
    if (!factory) return this.activateFallback();
    try {
      this.worker = factory();
      this.mode = 'worker';
      this.events.onModeChange('worker');
      this.worker.onmessage = (event) => this.handleWorkerMessage(event.data);
      this.worker.onerror = () => this.activateFallback();
    } catch {
      this.activateFallback();
    }
  }

  private defaultWorkerFactory(): (() => WorkerPort) | null {
    if (typeof Worker === 'undefined') return null;
    return () => new Worker(new URL('./sim-worker.ts', import.meta.url), { type: 'module' });
  }

  private handleWorkerMessage(message: unknown): void {
    if (!isWorkerResponse(message)) return;
    if (message.type === 'WORKER_READY') {
      this.workerReady = true;
      this.syncGraph();
      this.syncConfig(this.getSnapshot().trafficConfig);
      this.setSpeed(this.getSnapshot().speedMultiplier);
      return;
    }
    if (message.type === 'GRAPH_ACK') {
      this.acknowledgedGraphRevision = message.payload.graphRevision;
      if (this.pendingStart && this.acknowledgedGraphRevision === this.getSnapshot().graphRevision) {
        this.pendingStart = false;
        this.post({ type: 'START' });
      }
      return;
    }
    if (isCurrentGraphRevision(message.payload.graphRevision, this.getSnapshot().graphRevision)) {
      this.events.onTick(message.payload);
    }
  }

  private post(command: WorkerCommand): void { this.worker?.postMessage(command); }

  public syncGraph(): void {
    this.ensureInitialized();
    const snapshot = this.getSnapshot();
    if (this.worker && this.workerReady) this.post(createGraphUpdateMessage(snapshot.graph, snapshot.graphRevision));
    if (this.fallbackEngine) this.fallbackEngine.setGraph(snapshot.graph);
  }

  public syncConfig(config: Partial<TrafficConfig>): void {
    this.ensureInitialized();
    if (this.worker && this.workerReady) this.post({ type: 'UPDATE_CONFIG', payload: config });
    if (this.fallbackEngine) this.fallbackEngine.setConfig(config);
  }

  public setSpeed(multiplier: number): void {
    this.ensureInitialized();
    if (this.worker && this.workerReady) this.post({ type: 'SET_SPEED', payload: multiplier });
    if (this.fallbackEngine) this.fallbackEngine.setSpeedMultiplier(multiplier);
  }

  public start(): void {
    this.ensureInitialized();
    const snapshot = this.getSnapshot();
    this.syncGraph();
    this.syncConfig(snapshot.trafficConfig);
    this.setSpeed(snapshot.speedMultiplier);
    this.events.onStateChange('running');
    if (this.worker) {
      if (!this.workerReady || this.acknowledgedGraphRevision !== snapshot.graphRevision) this.pendingStart = true;
      else this.post({ type: 'START' });
    } else if (this.fallbackEngine) {
      this.fallbackEngine.start();
      this.startFallbackTimer();
    }
  }

  public pause(): void {
    this.ensureInitialized();
    this.events.onStateChange('paused');
    this.post({ type: 'PAUSE' });
    this.fallbackEngine?.pause();
    this.clearFallbackTimer();
  }

  public resume(): void {
    this.ensureInitialized();
    this.syncGraph();
    this.events.onStateChange('running');
    if (this.worker) this.post({ type: 'RESUME' });
    if (this.fallbackEngine) {
      this.fallbackEngine.resume();
      this.startFallbackTimer();
    }
  }

  public step(): void {
    this.ensureInitialized();
    this.syncGraph();
    if (this.worker) this.post({ type: 'STEP' });
    if (this.fallbackEngine) this.publishFallbackTick(this.fallbackEngine.step(100));
  }

  public stop(): void {
    this.ensureInitialized();
    this.events.onStateChange('stopped');
    this.post({ type: 'STOP' });
    this.fallbackEngine?.stop();
    this.clearFallbackTimer();
  }

  public reset(): void {
    this.ensureInitialized();
    this.events.onReset();
    this.post({ type: 'RESET' });
    this.fallbackEngine?.reset();
    this.clearFallbackTimer();
  }

  public getMode(): SimulationRuntimeMode { return this.mode; }

  public dispose(): void {
    this.clearFallbackTimer();
    if (this.worker) {
      this.post({ type: 'DISPOSE' });
      this.worker.terminate();
    }
    this.worker = null;
    this.fallbackEngine = null;
    this.workerReady = false;
    this.acknowledgedGraphRevision = -1;
    this.pendingStart = false;
    this.initialized = false;
  }

  private ensureInitialized(): void { if (!this.initialized) this.initialize(); }

  private activateFallback(): void {
    const shouldRun = this.getSnapshot().simState === 'running' || this.pendingStart;
    this.worker?.terminate();
    this.worker = null;
    this.workerReady = false;
    this.acknowledgedGraphRevision = -1;
    this.pendingStart = false;
    this.fallbackEngine = this.engineFactory();
    const snapshot = this.getSnapshot();
    this.fallbackEngine.setGraph(snapshot.graph);
    this.fallbackEngine.setConfig(snapshot.trafficConfig);
    this.fallbackEngine.setSpeedMultiplier(snapshot.speedMultiplier);
    this.mode = 'fallback';
    this.events.onModeChange('fallback');
    if (shouldRun) {
      this.fallbackEngine.start();
      this.startFallbackTimer();
    }
  }

  private startFallbackTimer(): void {
    this.clearFallbackTimer();
    let lastTime = this.now();
    this.fallbackTimer = this.setIntervalFn(() => {
      const current = this.now();
      const delta = Math.max(0, current - lastTime);
      lastTime = current;
      if (this.fallbackEngine) this.publishFallbackTick(this.fallbackEngine.step(delta));
    }, SIMULATION_LIMITS.uiUpdateIntervalMs);
  }

  private clearFallbackTimer(): void {
    if (!this.fallbackTimer) return;
    this.clearIntervalFn(this.fallbackTimer);
    this.fallbackTimer = null;
  }

  private publishFallbackTick(result: { metrics: OverallMetrics; activeRequests: SimRequest[]; recentRequests: SimRequest[] }): void {
    this.events.onTick({ ...result, graphRevision: this.getSnapshot().graphRevision });
  }
}
