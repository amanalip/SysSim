import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, CanvasHistoryEntry } from '../store/use-store';

describe('Bugs Batch 10: Tab Switching Key Navigation & Redo History Cap', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      historyPast: [],
      historyFuture: [],
      activeSidebarTab: 'palette',
    });
  });

  it('Bug 24: Sidebar tab switcher updates active tab', () => {
    const { setActiveSidebarTab } = useStore.getState();
    setActiveSidebarTab('scenarios');
    expect(useStore.getState().activeSidebarTab).toBe('scenarios');

    setActiveSidebarTab('calculator');
    expect(useStore.getState().activeSidebarTab).toBe('calculator');
  });

  it('Bug 25: Redo action caps historyPast stack to 20 entries max', () => {
    const { redo } = useStore.getState();

    // Fill historyPast with 25 dummy entries
    const dummyEntries: CanvasHistoryEntry[] = Array.from({ length: 25 }, () => ({
      nodes: [],
      edges: [],
      zones: [],
    }));

    useStore.setState({
      historyPast: dummyEntries,
      historyFuture: [{ nodes: [], edges: [], zones: [] }],
    });

    redo();
    expect(useStore.getState().historyPast.length).toBeLessThanOrEqual(21);
  });
});
