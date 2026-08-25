import { describe, it, expect } from 'vitest';
import { COMPONENT_METADATA_LIST, createDefaultConfig } from '../model/component-defaults';
import { useStore } from '../store/use-store';

describe('SysSim Smoke & Registry Test', () => {
  it('has 27 registered component types', () => {
    expect(COMPONENT_METADATA_LIST.length).toBe(27);
  });

  it('can create default configs for all components', () => {
    COMPONENT_METADATA_LIST.forEach((meta) => {
      const config = createDefaultConfig(meta.type, `test_${meta.type}`);
      expect(config.id).toBe(`test_${meta.type}`);
      expect(config.category).toBe(meta.category);
      expect(config.health).toBe('healthy');
    });
  });

  it('can initialize store with default theme and slices', () => {
    const state = useStore.getState();
    expect(state.theme).toBeDefined();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.simState).toBe('idle');
  });
});
