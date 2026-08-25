export class ConsistentHashRing {
  private ring: Array<{ hash: number; nodeId: string }> = [];
  private replicas: number;

  constructor(nodeIds: string[] = [], replicas: number = 50) {
    this.replicas = replicas;
    nodeIds.forEach((id) => this.addNode(id));
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  public addNode(nodeId: string): void {
    for (let i = 0; i < this.replicas; i++) {
      const vNodeKey = `${nodeId}#vnode_${i}`;
      const h = this.hash(vNodeKey);
      this.ring.push({ hash: h, nodeId });
    }
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  public removeNode(nodeId: string): void {
    this.ring = this.ring.filter((r) => r.nodeId !== nodeId);
  }

  public getNode(key: string): string | null {
    if (this.ring.length === 0) return null;
    const h = this.hash(key);

    // Binary search for closest ring node with hash >= h
    let low = 0;
    let high = this.ring.length - 1;
    let resultIdx = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.ring[mid].hash >= h) {
        resultIdx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // Wrap around to index 0 if target hash exceeds all ring nodes
    if (this.ring[resultIdx].hash < h) {
      return this.ring[0].nodeId;
    }

    return this.ring[resultIdx].nodeId;
  }
}
