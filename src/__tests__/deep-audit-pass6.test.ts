import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { simBridge } from '../engine/sim-bridge';
import { ALL_SCENARIOS } from '../scenarios';

describe('Deep Audit Pass 6 Bug Fixes & Feature Tests (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. verifies simBridge syncGraph formats nodes and edges without error', () => {
    const nodeA = useStore.getState().addNode('client', { x: 0, y: 0 });
    const nodeB = useStore.getState().addNode('app_server', { x: 200, y: 0 });
    useStore.getState().addEdge(nodeA, nodeB, 'HTTP');

    expect(() => simBridge.syncGraph()).not.toThrow();
  });

  it('2. verifies simBridge syncConfig passes updated traffic config', () => {
    expect(() => simBridge.syncConfig({ baseQps: 5000 })).not.toThrow();
  });

  it('3. verifies simBridge setSpeed sets speed multiplier', () => {
    expect(() => simBridge.setSpeed(2)).not.toThrow();
  });

  it('4. verifies simBridge pause transitions simState to paused', () => {
    simBridge.start();
    expect(useStore.getState().simState).toBe('running');

    simBridge.pause();
    expect(useStore.getState().simState).toBe('paused');
  });

  it('5. verifies simBridge stop transitions simState to stopped', () => {
    simBridge.start();
    simBridge.stop();
    expect(useStore.getState().simState).toBe('stopped');
  });

  it('6. verifies simBridge reset resets simulation state and metrics in store', () => {
    useStore.getState().updateMetrics({ totalRequestsSent: 150 });
    expect(useStore.getState().metrics.totalRequestsSent).toBe(150);

    simBridge.reset();
    expect(useStore.getState().metrics.totalRequestsSent).toBe(0);
    expect(useStore.getState().simState).toBe('idle');
  });

  it('7. verifies scenario constraints contain valid positive numbers', () => {
    const first = ALL_SCENARIOS[0];
    expect(first.constraints.targetQps).toBeGreaterThan(0);
    expect(first.constraints.maxP99LatencyMs).toBeGreaterThan(0);
    expect(first.constraints.availabilitySlaPercent).toBeGreaterThan(90);
  });

  it('8. verifies revealNextHint unlocks hints up to maximum available', () => {
    const scenario = ALL_SCENARIOS[0];
    useStore.getState().loadScenario(scenario);
    expect(useStore.getState().revealedHintsCount).toBe(0);

    useStore.getState().revealNextHint();
    expect(useStore.getState().revealedHintsCount).toBe(1);

    for (let i = 0; i < scenario.hints.length + 5; i++) {
      useStore.getState().revealNextHint();
    }
    expect(useStore.getState().revealedHintsCount).toBe(scenario.hints.length);
  });

  it('9. verifies toggleReferenceOverlay toggles reference overlay state', () => {
    expect(useStore.getState().showReferenceOverlay).toBe(false);

    useStore.getState().toggleReferenceOverlay();
    expect(useStore.getState().showReferenceOverlay).toBe(true);

    useStore.getState().toggleReferenceOverlay();
    expect(useStore.getState().showReferenceOverlay).toBe(false);
  });

  it('10. verifies closeScenario resets active and current scenario references', () => {
    const scenario = ALL_SCENARIOS[0];
    useStore.getState().loadScenario(scenario);
    expect(useStore.getState().activeScenario).toBeDefined();

    useStore.getState().closeScenario();
    expect(useStore.getState().activeScenario).toBeNull();
    expect(useStore.getState().currentScenario).toBeNull();
  });
});
