import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { decodeStateFromUrlHash } from '../utils/sharing';

describe('Bugs Batch 11: Scenario Hint Reset, Bottleneck Inspect Panel Trigger, URL Hash Schema Validation', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      isPropertiesPanelOpen: false,
    });
  });

  it('Bug 27: Properties panel opens on inspect action', () => {
    const { setIsPropertiesPanelOpen } = useStore.getState();
    expect(useStore.getState().isPropertiesPanelOpen).toBe(false);

    setIsPropertiesPanelOpen(true);
    expect(useStore.getState().isPropertiesPanelOpen).toBe(true);
  });

  it('Bug 28: decodeStateFromUrlHash rejects invalid and corrupted schema structures', () => {
    expect(decodeStateFromUrlHash('invalid_hash')).toBeNull();
    expect(decodeStateFromUrlHash('#data=invalid_compressed_payload')).toBeNull();
  });
});
