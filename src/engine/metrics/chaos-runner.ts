import { useStore } from '../../store/use-store';
import { simBridge } from '../sim-bridge';

class ChaosRunner {
  private timer: ReturnType<typeof setInterval> | null = null;

  public start(intervalSec: number = 10): void {
    this.stop();
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

      useStore.getState().setNodeHealthOverride(randomNode.id, nextHealth);
      useStore.getState().addToast(
        `Chaos Monkey: Marked ${randomNode.data.config.name} as ${nextHealth.toUpperCase()}`,
        nextHealth === 'down' ? 'error' : 'success'
      );
      simBridge.syncGraph();
    }, intervalSec * 1000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const chaosRunner = new ChaosRunner();
