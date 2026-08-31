export interface RuntimePerformanceSample {
  workerStepCpuMs: number;
  workerMessageBytes: number;
  uiFramesPerSecond: number | null;
  uiHeapBytes: number | null;
  measuredAt: number;
}

interface MemoryPerformance extends Performance {
  memory?: { usedJSHeapSize?: number };
}

let latest: RuntimePerformanceSample = {
  workerStepCpuMs: 0,
  workerMessageBytes: 0,
  uiFramesPerSecond: null,
  uiHeapBytes: null,
  measuredAt: 0,
};
let stopFrameMonitor: (() => void) | null = null;

export function recordWorkerPerformance(workerStepCpuMs: number, workerMessageBytes: number): void {
  latest = {
    ...latest,
    workerStepCpuMs: Math.max(0, workerStepCpuMs),
    workerMessageBytes: Math.max(0, Math.round(workerMessageBytes)),
    measuredAt: Date.now(),
  };
}

export function getRuntimePerformanceSnapshot(): RuntimePerformanceSample {
  return { ...latest };
}

export function startUiPerformanceMonitor(): () => void {
  if (stopFrameMonitor) return stopFrameMonitor;
  if (typeof requestAnimationFrame === 'undefined') return () => undefined;
  let frame = 0;
  let frameCount = 0;
  let windowStarted = performance.now();
  let stopped = false;
  const measure = (timestamp: number) => {
    if (stopped) return;
    frameCount += 1;
    const elapsed = timestamp - windowStarted;
    if (elapsed >= 1_000) {
      const memory = performance as MemoryPerformance;
      latest = {
        ...latest,
        uiFramesPerSecond: Math.round((frameCount * 1_000) / elapsed),
        uiHeapBytes:
          typeof memory.memory?.usedJSHeapSize === 'number' ? memory.memory.usedJSHeapSize : null,
        measuredAt: Date.now(),
      };
      frameCount = 0;
      windowStarted = timestamp;
    }
    frame = requestAnimationFrame(measure);
  };
  frame = requestAnimationFrame(measure);
  stopFrameMonitor = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    stopFrameMonitor = null;
  };
  return stopFrameMonitor;
}
