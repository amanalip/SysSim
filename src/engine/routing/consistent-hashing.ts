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
    for (let i = 0; i < this.ring.length; i++) {
      if (this.ring[i].hash >= h) {
        return this.ring[i].nodeId;
      }
    }
    return this.ring[0].nodeId;
  }
}
