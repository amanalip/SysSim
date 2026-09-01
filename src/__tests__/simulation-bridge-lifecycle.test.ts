import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SimulationBridge,
  SimulationBridgeEvents,
  SimulationBridgeSnapshot,
} from '../engine/sim-bridge';
import { SysSimEngine } from '../engine/simulator';
import { isWorkerCommand, isWorkerResponse, WorkerCommand } from '../engine/worker-protocol';
import { createInitialMetrics } from '../store/slices/initial-state';

function fixture() {
  let snapshot: SimulationBridgeSnapshot = {
    graph: { nodes: [], edges: [] },
    graphRevision: 4,
    trafficConfig: {
      pattern: 'steady',
      baseQps: 10,
      burstMultiplier: 2,
      rampDurationSec: 10,
      spikeFrequencySec: 10,
    },
    speedMultiplier: 1,
    simState: 'idle',
  };
  const events: SimulationBridgeEvents = {
    onTick: vi.fn(),
    onStateChange: vi.fn(),
    onModeChange: vi.fn(),
    onReset: vi.fn(),
    onError: vi.fn(),
  };
  const posted: WorkerCommand[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    postMessage: vi.fn((message: WorkerCommand) => posted.push(message)),
    terminate: vi.fn(),
  };
  return {
    getSnapshot: () => snapshot,
    setSnapshot: (value: Partial<SimulationBridgeSnapshot>) => {
      snapshot = { ...snapshot, ...value };
    },
    events,
    posted,
    worker,
  };
}

describe('simulation boundary and worker lifecycle tasks 216-221 and 254-262', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uses typed, validated commands and responses', () => {
    expect(isWorkerCommand({ type: 'SET_SPEED', payload: 2 })).toBe(true);
    expect(isWorkerCommand({ type: 'SET_SPEED', payload: Infinity })).toBe(false);
    expect(isWorkerResponse({ type: 'GRAPH_ACK', payload: { graphRevision: 1 } })).toBe(true);
    expect(isWorkerResponse({ type: 'TICK_UPDATE', payload: { graphRevision: 'old' } })).toBe(
      false,
    );
  });

  it('waits for worker readiness and the current graph acknowledgement before start', () => {
    const f = fixture();
    const bridge = new SimulationBridge(f.getSnapshot, f.events, { workerFactory: () => f.worker });
    bridge.start();
    expect(f.posted).not.toContainEqual({ type: 'START' });
    f.worker.onmessage?.({ data: { type: 'WORKER_READY' } } as MessageEvent);
    expect(f.posted.some((message) => message.type === 'INIT_OR_UPDATE_GRAPH')).toBe(true);
    expect(f.posted).not.toContainEqual({ type: 'START' });
    f.worker.onmessage?.({
      data: { type: 'GRAPH_ACK', payload: { graphRevision: 3 } },
    } as MessageEvent);
    expect(f.posted).not.toContainEqual({ type: 'START' });
    f.worker.onmessage?.({
      data: { type: 'GRAPH_ACK', payload: { graphRevision: 4 } },
    } as MessageEvent);
    expect(f.posted).toContainEqual({ type: 'START' });

    bridge.syncConfig({ baseQps: 25 });
    bridge.setSpeed(2);
    bridge.pause();
    bridge.resume();
    bridge.step();
    bridge.stop();
    bridge.reset();
    f.worker.onmessage?.({
      data: {
        type: 'TICK_UPDATE',
        payload: {
          graphRevision: 4,
          elapsedSimulationMs: 100,
          metrics: createInitialMetrics(),
          activeRequests: [],
          recentRequests: [],
        },
      },
    } as MessageEvent);
    expect(f.events.onTick).toHaveBeenCalledOnce();
    expect(f.posted.map((message) => message.type)).toEqual(
      expect.arrayContaining([
        'UPDATE_CONFIG',
        'SET_SPEED',
        'PAUSE',
        'RESUME',
        'STEP',
        'STOP',
        'RESET',
      ]),
    );
    bridge.dispose();
    expect(f.posted.at(-1)).toEqual({ type: 'DISPOSE' });
  });

  it('ignores invalid and stale tick payloads', () => {
    const f = fixture();
    const bridge = new SimulationBridge(f.getSnapshot, f.events, { workerFactory: () => f.worker });
    bridge.initialize();
    f.worker.onmessage?.({
      data: {
        type: 'TICK_UPDATE',
        payload: { graphRevision: 2, metrics: {}, activeRequests: [], recentRequests: [] },
      },
    } as MessageEvent);
    f.worker.onmessage?.({ data: { type: 'TICK_UPDATE', payload: null } } as MessageEvent);
    expect(f.events.onTick).not.toHaveBeenCalled();
    expect(f.events.onError).toHaveBeenCalledWith(
      'worker',
      'Simulation worker returned an invalid message',
    );
  });

  it('falls back independently, preserves displayed metrics, and never duplicates timers', () => {
    const f = fixture();
    f.setSnapshot({ simState: 'running' });
    const timers: Array<() => void> = [];
    const setIntervalFn = vi.fn((callback: TimerHandler) => {
      timers.push(callback as () => void);
      return timers.length as unknown as ReturnType<typeof setInterval>;
    });
    const clearIntervalFn = vi.fn();
    const bridge = new SimulationBridge(f.getSnapshot, f.events, {
      workerFactory: () => {
        throw new Error('blocked');
      },
      setIntervalFn: setIntervalFn as unknown as typeof setInterval,
      clearIntervalFn,
    });
    bridge.initialize();
    expect(bridge.getMode()).toBe('fallback');
    expect(f.events.onReset).not.toHaveBeenCalled();
    bridge.resume();
    bridge.resume();
    expect(setIntervalFn).toHaveBeenCalledTimes(3);
    expect(clearIntervalFn).toHaveBeenCalledTimes(2);
    bridge.pause();
    expect(clearIntervalFn).toHaveBeenCalledTimes(3);
  });

  it('executes the complete fallback lifecycle and publishes measured ticks', () => {
    const f = fixture();
    const metrics = createInitialMetrics();
    const engine = {
      setGraph: vi.fn(),
      setConfig: vi.fn(),
      setSpeedMultiplier: vi.fn(),
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      step: vi.fn(() => ({ metrics, activeRequests: [], recentRequests: [] })),
      stop: vi.fn(),
      reset: vi.fn(),
      getElapsedSimulationMs: vi.fn(() => 250),
    } as unknown as SysSimEngine;
    let timerCallback: (() => void) | undefined;
    const setIntervalFn = vi.fn((callback: TimerHandler) => {
      timerCallback = callback as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    });
    const clearIntervalFn = vi.fn();
    let currentTime = 1_000;
    const bridge = new SimulationBridge(f.getSnapshot, f.events, {
      workerFactory: () => {
        throw 'worker unavailable';
      },
      engineFactory: () => engine,
      setIntervalFn: setIntervalFn as unknown as typeof setInterval,
      clearIntervalFn,
      now: () => currentTime,
    });

    bridge.start();
    currentTime += 50;
    timerCallback?.();
    bridge.step();
    bridge.pause();
    bridge.resume();
    bridge.stop();
    bridge.reset();

    expect(f.events.onError).toHaveBeenCalledWith('worker', 'Simulation worker could not start');
    expect(engine.start).toHaveBeenCalledOnce();
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(engine.resume).toHaveBeenCalledOnce();
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(engine.reset).toHaveBeenCalledOnce();
    expect(engine.step).toHaveBeenNthCalledWith(1, 50);
    expect(engine.step).toHaveBeenNthCalledWith(2, 100);
    expect(f.events.onTick).toHaveBeenCalledTimes(2);
    expect(f.events.onTick).toHaveBeenLastCalledWith(
      expect.objectContaining({
        graphRevision: 4,
        elapsedSimulationMs: 250,
        performance: expect.objectContaining({ messageBytes: expect.any(Number) }),
      }),
    );
    expect(clearIntervalFn).toHaveBeenCalled();
  });

  it('uses the built-in engine fallback when workers are unavailable', () => {
    const f = fixture();
    vi.stubGlobal('Worker', undefined);
    const bridge = new SimulationBridge(f.getSnapshot, f.events);
    bridge.initialize();
    expect(bridge.getMode()).toBe('fallback');
    expect(f.events.onModeChange).toHaveBeenCalledWith('fallback');
    bridge.dispose();
  });

  it('recovers from runtime worker failure and terminates resources on disposal', () => {
    const f = fixture();
    f.setSnapshot({ simState: 'running' });
    const setIntervalFn = vi.fn(() => 1 as unknown as ReturnType<typeof setInterval>);
    const clearIntervalFn = vi.fn();
    const bridge = new SimulationBridge(f.getSnapshot, f.events, {
      workerFactory: () => f.worker,
      setIntervalFn: setIntervalFn as unknown as typeof setInterval,
      clearIntervalFn,
    });
    bridge.initialize();
    f.worker.onerror?.({} as ErrorEvent);
    expect(f.worker.terminate).toHaveBeenCalledTimes(1);
    expect(bridge.getMode()).toBe('fallback');
    expect(f.events.onError).toHaveBeenCalledWith('worker', 'Simulation worker failed');
    bridge.dispose();
    expect(clearIntervalFn).toHaveBeenCalled();
  });

  it('each bridge owns isolated lifecycle state', () => {
    const first = fixture();
    const second = fixture();
    const a = new SimulationBridge(first.getSnapshot, first.events, {
      workerFactory: () => first.worker,
    });
    const b = new SimulationBridge(second.getSnapshot, second.events, {
      workerFactory: () => second.worker,
    });
    a.initialize();
    expect(first.worker.terminate).not.toHaveBeenCalled();
    expect(second.worker.postMessage).not.toHaveBeenCalled();
    a.dispose();
    expect(first.worker.terminate).toHaveBeenCalledOnce();
    expect(second.worker.terminate).not.toHaveBeenCalled();
    b.dispose();
  });
});
