/** A bounded FIFO sample with incrementally maintained sort order. */
export class RollingQuantile {
  private readonly insertionOrder: number[] = [];
  private readonly sorted: number[] = [];
  private total = 0;

  public constructor(private readonly capacity: number) {}

  public add(value: number): void {
    if (!Number.isFinite(value)) return;
    this.insertionOrder.push(value);
    this.total += value;
    this.insertSorted(value);
    if (this.insertionOrder.length > this.capacity) this.removeOldest();
  }

  public remove(value: number): void {
    const orderIndex = this.insertionOrder.indexOf(value);
    if (orderIndex >= 0) this.insertionOrder.splice(orderIndex, 1);
    this.removeSorted(value);
    this.total -= value;
  }

  public quantile(probability: number): number {
    if (this.sorted.length === 0) return 0;
    const p = Math.min(1, Math.max(0, probability));
    const rank = Math.max(1, Math.ceil(p * this.sorted.length));
    return this.sorted[Math.min(this.sorted.length - 1, rank - 1)];
  }

  public average(): number {
    return this.sorted.length > 0 ? this.total / this.sorted.length : 0;
  }

  public clear(): void {
    this.insertionOrder.length = 0;
    this.sorted.length = 0;
    this.total = 0;
  }

  private insertSorted(value: number): void {
    let low = 0;
    let high = this.sorted.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (this.sorted[middle] <= value) low = middle + 1;
      else high = middle;
    }
    this.sorted.splice(low, 0, value);
  }

  private removeOldest(): void {
    const oldest = this.insertionOrder.shift();
    if (oldest === undefined) return;
    this.removeSorted(oldest);
    this.total -= oldest;
  }

  private removeSorted(value: number): void {
    const index = this.sorted.indexOf(value);
    if (index >= 0) this.sorted.splice(index, 1);
  }
}
