import { useStore } from '../../store/use-store';
import { simBridge } from '../sim-bridge';

class ChaosRunner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private originalHealth = new Map<string, import('../../model/types').NodeHealthStatus>();

  public start(intervalSec: number = 10): void {
    this.stop(false);
    this.timer = setInterval(() => {
      const { nodes, isChaosMode, simState } = useStore.getState();
      if (!isChaosMode || simState !== 'running' || nodes.length === 0) {
        return;
      }

      // Pick a random non-client node to toggle
      const candidateNodes = nodes.filter((n) => n.data.config.type !== 'client');
      if (candidateNodes.length === 0) return;

      const randomNode = candidateNodes[Math.floor(Math.random() * candidateNodes.length)];
      const currentHealth = randomNode.data.config.health;
      const nextHealth = currentHealth === 'down' ? 'healthy' : 'down';

      if (nextHealth === 'down') {
        if (!this.originalHealth.has(randomNode.id)) this.originalHealth.set(randomNode.id, currentHealth);
      } else {
        const original = this.originalHealth.get(randomNode.id) || 'healthy';
        this.originalHealth.delete(randomNode.id);
        useStore.getState().setNodeHealthOverride(randomNode.id, original, 'chaos');
        simBridge.syncGraph();
        return;
      }

      useStore.getState().setNodeHealthOverride(randomNode.id, nextHealth, 'chaos');
      useStore.getState().addToast(
        `Chaos Monkey: Marked ${randomNode.data.config.name} as ${nextHealth.toUpperCase()}`,
        nextHealth === 'down' ? 'error' : 'success'
      );
      simBridge.syncGraph();
    }, intervalSec * 1000);
  }

  public stop(restoreNodes: boolean = true): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (restoreNodes && this.originalHealth.size > 0) {
      this.originalHealth.forEach((health, id) => {
        useStore.getState().setNodeHealthOverride(id, health, 'manual');
      });
      this.originalHealth.clear();
      simBridge.syncGraph();
    }
  }

  public restoreAll(): void {
    this.originalHealth.forEach((health, id) => {
      useStore.getState().setNodeHealthOverride(id, health, 'manual');
    });
    this.originalHealth.clear();
    simBridge.syncGraph();
  }
}

export const chaosRunner = new ChaosRunner();
