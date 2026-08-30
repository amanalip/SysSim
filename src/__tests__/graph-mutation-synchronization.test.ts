import { beforeEach, describe, expect, it, vi } from 'vitest';
import { simBridge } from '../engine/sim-bridge';
import { useStore } from '../store/use-store';

describe('authoritative graph mutations tasks 205-210', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      historyPast: [],
      historyFuture: [],
      graphRevision: 0,
      selectedNodeId: null,
      selectedEdgeId: null,
      simState: 'running',
    });
    vi.restoreAllMocks();
  });

  it('synchronizes node and edge additions from the store', () => {
    const sync = vi.spyOn(simBridge, 'syncGraph').mockImplementation(() => undefined);
    const client = useStore.getState().addNode('client', { x: 0, y: 0 });
    const app = useStore.getState().addNode('app_server', { x: 100, y: 0 });
    expect(useStore.getState().addEdge(client, app)).toBe(true);
    expect(useStore.getState().graphRevision).toBe(3);
    expect(sync).toHaveBeenCalledTimes(3);
  });

  it('keeps position-only changes local to the canvas', () => {
    const sync = vi.spyOn(simBridge, 'syncGraph').mockImplementation(() => undefined);
    const node = useStore.getState().addNode('client', { x: 0, y: 0 });
    sync.mockClear();
    const revision = useStore.getState().graphRevision;
    useStore.getState().updateNodePosition(node, { x: 200, y: 300 });
    expect(useStore.getState().graphRevision).toBe(revision);
    expect(sync).not.toHaveBeenCalled();
  });

  it('batches React Flow-style multi-item deletion into one history entry and sync', () => {
    const sync = vi.spyOn(simBridge, 'syncGraph').mockImplementation(() => undefined);
    const client = useStore.getState().addNode('client', { x: 0, y: 0 });
    const app = useStore.getState().addNode('app_server', { x: 100, y: 0 });
    const db = useStore.getState().addNode('sql_db', { x: 200, y: 0 });
    useStore.getState().addEdge(client, app);
    useStore.getState().addEdge(app, db);
    sync.mockClear();
    const historyLength = useStore.getState().historyPast.length;
    const revision = useStore.getState().graphRevision;
    useStore.getState().removeGraphItems([app, db], []);
    expect(useStore.getState().nodes.map((node) => node.id)).toEqual([client]);
    expect(useStore.getState().edges).toHaveLength(0);
    expect(useStore.getState().historyPast).toHaveLength(historyLength + 1);
    expect(useStore.getState().graphRevision).toBe(revision + 1);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});
