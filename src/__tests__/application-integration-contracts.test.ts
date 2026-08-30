import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configureGraphMutationListener,
  configureTrafficConfigListener,
} from '../engine/simulation-command-bus';
import { ALL_SCENARIOS } from '../scenarios';
import { useStore } from '../store/use-store';

describe('store-to-simulation integration contracts', () => {
  beforeEach(() => {
    configureGraphMutationListener(null);
    configureTrafficConfigListener(null);
  });

  it('synchronizes a scenario traffic preset without replacing the user graph', () => {
    const syncTraffic = vi.fn();
    configureTrafficConfigListener(syncTraffic);
    const nodeId = useStore.getState().addNode('client', { x: 20, y: 30 });
    const scenario = ALL_SCENARIOS[50];

    useStore.getState().loadScenario(scenario);

    expect(useStore.getState().nodes.map(({ id }) => id)).toEqual([nodeId]);
    expect(useStore.getState().trafficConfig).toEqual(scenario.trafficPreset);
    expect(syncTraffic).toHaveBeenCalledExactlyOnceWith(scenario.trafficPreset);
  });

  it('synchronizes direct traffic edits and reference-graph replacement independently', () => {
    const syncTraffic = vi.fn();
    const syncGraph = vi.fn();
    configureTrafficConfigListener(syncTraffic);
    configureGraphMutationListener(syncGraph);

    useStore.getState().setTrafficConfig({ baseQps: 1_234 });
    useStore.getState().loadReferenceDesign(ALL_SCENARIOS[0].referenceDesign);

    expect(syncTraffic).toHaveBeenCalledExactlyOnceWith({ baseQps: 1_234 });
    expect(syncGraph).toHaveBeenCalledOnce();
    expect(useStore.getState().nodes).toHaveLength(ALL_SCENARIOS[0].referenceDesign.nodes.length);
  });
});
