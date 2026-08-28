export interface ServerlessInvocationResult {
  executionLatencyMs: number; coldStartLatencyMs: number; queueLatencyMs: number;
  totalLatencyMs: number; coldStart: boolean; coldStartProbabilityPercent: number;
  timedOut: boolean; activeInvocations: number; queuedInvocations: number;
}

export interface ServerlessMetrics {
  activeInvocations: number; queuedInvocations: number; coldStarts: number;
  warmStarts: number; timeouts: number; coldStartProbabilityPercent: number;
  avgExecutionLatencyMs: number; utilizationPercent: number;
}

interface InstanceSlot { availableAtMs: number; warmUntilMs: number; initialized: boolean }

export class ServerlessModel {
  private slots: InstanceSlot[] = [];
  private coldStarts = 0; private warmStarts = 0; private timeouts = 0;
  private totalExecutionLatencyMs = 0; private lastColdProbabilityPercent = 100;
  private scheduledServiceStartsMs: number[] = [];

  constructor(
    private concurrencyLimit: number, private timeoutMs: number, private memoryMb: number,
    private coldStartMs: number, private baseExecutionLatencyMs: number,
    private warmInstances: number, private idleTimeoutSec: number, private random: () => number,
  ) { this.reset(); }

  public invoke(arrivalTimeMs: number): ServerlessInvocationResult {
    let selectedIndex = this.findAvailableSlot(arrivalTimeMs);
    let queueLatencyMs = 0;
    if (selectedIndex < 0 && this.slots.length < this.capacity) {
      this.slots.push({ availableAtMs: 0, warmUntilMs: 0, initialized: false });
      selectedIndex = this.slots.length - 1;
    } else if (selectedIndex < 0) {
      selectedIndex = this.findEarliestSlot();
      queueLatencyMs = Math.max(0, this.slots[selectedIndex].availableAtMs - arrivalTimeMs);
    }

    const slot = this.slots[selectedIndex];
    const serviceStartMs = arrivalTimeMs + queueLatencyMs;
    if (queueLatencyMs > 0) this.scheduledServiceStartsMs.push(serviceStartMs);
    const idleMs = Math.max(0, serviceStartMs - slot.availableAtMs);
    const provisionedWarm = selectedIndex < this.provisionedWarmCount;
    const stillWarm = slot.initialized && slot.warmUntilMs >= serviceStartMs;
    const idleTimeoutMs = Math.max(1, this.idleTimeoutSec * 1000);
    const coldProbability = provisionedWarm || stillWarm ? 0 : !slot.initialized ? 1 : Math.min(1, idleMs / idleTimeoutMs);
    const coldStart = coldProbability >= 1 || this.random() < coldProbability;
    this.lastColdProbabilityPercent = Math.round(coldProbability * 1000) / 10;

    const executionLatencyMs = Math.max(0, this.baseExecutionLatencyMs) * Math.sqrt(512 / Math.max(128, this.memoryMb));
    const coldStartLatencyMs = coldStart ? Math.max(0, this.coldStartMs) : 0;
    const invocationLatencyMs = executionLatencyMs + coldStartLatencyMs;
    const timedOut = invocationLatencyMs > Math.max(1, this.timeoutMs);
    const billedLatencyMs = timedOut ? Math.max(1, this.timeoutMs) : invocationLatencyMs;
    slot.availableAtMs = serviceStartMs + billedLatencyMs;
    slot.warmUntilMs = slot.availableAtMs + idleTimeoutMs;
    slot.initialized = true;
    if (coldStart) this.coldStarts++; else this.warmStarts++;
    if (timedOut) this.timeouts++;
    this.totalExecutionLatencyMs += executionLatencyMs;
    const metrics = this.getMetrics(arrivalTimeMs);
    return {
      executionLatencyMs, coldStartLatencyMs, queueLatencyMs,
      totalLatencyMs: queueLatencyMs + billedLatencyMs, coldStart,
      coldStartProbabilityPercent: this.lastColdProbabilityPercent, timedOut,
      activeInvocations: metrics.activeInvocations, queuedInvocations: metrics.queuedInvocations,
    };
  }

  public getMetrics(nowMs: number): ServerlessMetrics {
    const activeInvocations = this.slots.filter((slot) => slot.availableAtMs > nowMs).length;
    this.scheduledServiceStartsMs = this.scheduledServiceStartsMs.filter((startAt) => startAt > nowMs);
    const queuedInvocations = this.scheduledServiceStartsMs.length;
    const invocations = this.coldStarts + this.warmStarts;
    return {
      activeInvocations, queuedInvocations, coldStarts: this.coldStarts, warmStarts: this.warmStarts,
      timeouts: this.timeouts, coldStartProbabilityPercent: this.lastColdProbabilityPercent,
      avgExecutionLatencyMs: invocations > 0 ? this.totalExecutionLatencyMs / invocations : 0,
      utilizationPercent: Math.min(100, Math.round((activeInvocations / this.capacity) * 1000) / 10),
    };
  }

  public reset(): void {
    this.slots = Array.from({ length: this.provisionedWarmCount }, () => ({ availableAtMs: 0, warmUntilMs: Number.POSITIVE_INFINITY, initialized: true }));
    this.coldStarts = 0; this.warmStarts = 0; this.timeouts = 0;
    this.totalExecutionLatencyMs = 0; this.lastColdProbabilityPercent = 100;
    this.scheduledServiceStartsMs = [];
  }

  private findAvailableSlot(nowMs: number): number { return this.slots.findIndex((slot) => slot.availableAtMs <= nowMs); }
  private findEarliestSlot(): number {
    let selected = 0;
    for (let index = 1; index < this.slots.length; index++) if (this.slots[index].availableAtMs < this.slots[selected].availableAtMs) selected = index;
    return selected;
  }
  private get capacity(): number { return Math.max(1, Math.floor(this.concurrencyLimit || 1)); }
  private get provisionedWarmCount(): number { return Math.min(this.capacity, Math.max(0, Math.floor(this.warmInstances || 0))); }
}
