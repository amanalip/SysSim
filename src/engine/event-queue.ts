export type SimulationEventKind =
  | 'arrival'
  | 'node_service_completion'
  | 'edge_transfer'
  | 'timeout'
  | 'retry'
  | 'queue_drain'
  | 'recovery'
  | 'request_completion';

export interface SimulationEvent<T = unknown> {
  id: number;
  timeMs: number;
  kind: SimulationEventKind;
  payload: T;
}

/** Stable binary min-heap ordered by simulation time, then insertion id. */
export class EventPriorityQueue {
  private heap: SimulationEvent[] = [];
  private nextId = 0;
  private rejected = 0;

  constructor(private readonly maxSize = Number.POSITIVE_INFINITY) {}

  public schedule<T>(timeMs: number, kind: SimulationEventKind, payload: T): SimulationEvent<T> | undefined {
    if (this.heap.length >= this.maxSize) { this.rejected++; return undefined; }
    const event = { id: this.nextId++, timeMs: Math.max(0, timeMs), kind, payload };
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
    return event;
  }

  public drainUntil(timeMs: number, handler: (event: SimulationEvent) => void): number {
    let processed = 0;
    while (this.heap[0] && this.heap[0].timeMs <= timeMs) {
      handler(this.pop()!);
      processed++;
    }
    return processed;
  }

  public size(): number { return this.heap.length; }
  public rejectedCount(): number { return this.rejected; }
  public kinds(): SimulationEventKind[] { return this.heap.map((event) => event.kind); }
  public clear(): void { this.heap = []; this.nextId = 0; this.rejected = 0; }

  private pop(): SimulationEvent | undefined {
    if (!this.heap.length) return undefined;
    const first = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length) { this.heap[0] = last; this.bubbleDown(0); }
    return first;
  }
  private before(a: SimulationEvent, b: SimulationEvent): boolean { return a.timeMs < b.timeMs || (a.timeMs === b.timeMs && a.id < b.id); }
  private bubbleUp(index: number): void {
    while (index > 0) { const parent = Math.floor((index - 1) / 2); if (!this.before(this.heap[index], this.heap[parent])) break; [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]]; index = parent; }
  }
  private bubbleDown(index: number): void {
    for (;;) { const left = index * 2 + 1; const right = left + 1; let smallest = index; if (left < this.heap.length && this.before(this.heap[left], this.heap[smallest])) smallest = left; if (right < this.heap.length && this.before(this.heap[right], this.heap[smallest])) smallest = right; if (smallest === index) return; [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]]; index = smallest; }
  }
}
