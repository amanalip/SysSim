export interface WorkerMetrics {
  busyWorkers: number;
  queuedWork: number;
  processingLatencyMs: number;
  jobsSucceeded: number;
  jobsFailed: number;
  retriesScheduled: number;
  utilizationPercent: number;
}

export class WorkerModel {
  private busyWorkers = 0;
  private queuedWork = 0;
  private jobsSucceeded = 0;
  private jobsFailed = 0;
  private retriesScheduled = 0;

  constructor(
    private replicas: number,
    private concurrencyLimit: number,
    private processingRatePerSec: number,
    private configuredProcessingLatencyMs: number,
    public readonly retryLimit: number,
  ) {}

  public beginStep(): void { this.busyWorkers = 0; this.queuedWork = 0; }

  public recordAttempt(success: boolean, willRetry: boolean): void {
    this.busyWorkers = Math.min(this.capacity, this.busyWorkers + 1);
    if (success) this.jobsSucceeded++; else this.jobsFailed++;
    if (willRetry) this.retriesScheduled++;
  }

  public setQueuedWork(value: number): void { this.queuedWork = Math.max(0, Math.floor(value)); }

  public getProcessingLatencyMs(): number {
    const rateLatency = this.processingRatePerSec > 0 ? 1000 / this.processingRatePerSec : Number.POSITIVE_INFINITY;
    return Math.max(0, this.configuredProcessingLatencyMs, rateLatency);
  }

  public getMetrics(): WorkerMetrics {
    return {
      busyWorkers: this.busyWorkers,
      queuedWork: this.queuedWork,
      processingLatencyMs: this.getProcessingLatencyMs(),
      jobsSucceeded: this.jobsSucceeded,
      jobsFailed: this.jobsFailed,
      retriesScheduled: this.retriesScheduled,
      utilizationPercent: Math.min(100, Math.round((this.busyWorkers / this.capacity) * 1000) / 10),
    };
  }

  public reset(): void {
    this.busyWorkers = 0; this.queuedWork = 0; this.jobsSucceeded = 0;
    this.jobsFailed = 0; this.retriesScheduled = 0;
  }

  private get capacity(): number {
    return Math.max(1, Math.floor(this.replicas || 1)) * Math.max(1, Math.floor(this.concurrencyLimit || 1));
  }
}
