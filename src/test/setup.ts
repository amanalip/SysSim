import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { useStore } from '../store/use-store';

const testTrafficConfig = {
  pattern: 'steady' as const,
  baseQps: 500,
  burstMultiplier: 3,
  rampDurationSec: 30,
  spikeFrequencySec: 10,
  seed: 1,
  requestKeyDistribution: 'uniform' as const,
  requestKeySpaceSize: 100,
};

/** Restores singleton state so test order cannot affect public behavior assertions. */
export function resetTestEnvironment() {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  useStore.setState({
    nodes: [],
    edges: [],
    zones: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    historyPast: [],
    historyFuture: [],
    canUndo: false,
    canRedo: false,
    graphRevision: 0,
    simState: 'idle',
    trafficConfig: testTrafficConfig,
    activeRequests: [],
    recentRequests: [],
    toasts: [],
    currentScenario: null,
    activeScenario: null,
    activeScenarioId: null,
    scenarioProgress: {},
    revealedHintsCount: 0,
    showReferenceOverlay: false,
    sideBySideMode: false,
  });
}

afterEach(resetTestEnvironment);

// Polyfill ResizeObserver for DOM test environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
