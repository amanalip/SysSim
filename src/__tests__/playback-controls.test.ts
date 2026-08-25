import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';

describe('Simulation Animation & Playback Controls Tests (Milestones 8 and 9)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('updates simulation state and speed multipliers', () => {
    expect(useStore.getState().simState).toBe('idle');

    useStore.getState().setSimState('running');
    expect(useStore.getState().simState).toBe('running');

    useStore.getState().setSpeedMultiplier(5);
    expect(useStore.getState().speedMultiplier).toBe(5);

    useStore.getState().resetSimulation();
    expect(useStore.getState().simState).toBe('idle');
  });

  it('configures traffic patterns and QPS rates', () => {
    useStore.getState().setTrafficConfig({
      pattern: 'bursty',
      baseQps: 1500,
      burstMultiplier: 4,
    });

    const config = useStore.getState().trafficConfig;
    expect(config.pattern).toBe('bursty');
    expect(config.baseQps).toBe(1500);
    expect(config.burstMultiplier).toBe(4);
  });

  it('tracks chaos mode state toggle', () => {
    expect(useStore.getState().isChaosMode).toBe(false);

    useStore.getState().setChaosMode(true, 10);
    expect(useStore.getState().isChaosMode).toBe(true);
    expect(useStore.getState().chaosIntervalSec).toBe(10);
  });
});
