import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGraphUpdateMessage, isCurrentGraphRevision } from '../engine/sim-bridge';
import { configureGraphMutationListener } from '../engine/simulation-command-bus';
import { createSimRequest } from '../engine/request';
import { SysSimEngine } from '../engine/simulator';
import { createDefaultConfig } from '../model/component-defaults';
import { useStore } from '../store/use-store';

describe('graph revision and live routing tasks 211-215', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      graphRevision: 0,
      historyPast: [],
      historyFuture: [],
    });
    vi.restoreAllMocks();
    configureGraphMutationListener(null);
  });

  it('tags graph messages and rejects results from every stale revision', () => {
    const graph = {
      nodes: [{ id: 'client', config: createDefaultConfig('client', 'client') }],
      edges: [],
    };
    expect(createGraphUpdateMessage(graph, 7)).toEqual({
      type: 'INIT_OR_UPDATE_GRAPH',
      payload: { graph, graphRevision: 7 },
    });
    expect(isCurrentGraphRevision(7, 7)).toBe(true);
    expect(isCurrentGraphRevision(6, 7)).toBe(false);
    expect(isCurrentGraphRevision(8, 7)).toBe(false);
  });

  it('uses a newly added route immediately while the engine is running', () => {
    const client = { id: 'client', config: createDefaultConfig('client', 'client') };
    const app = { id: 'app', config: createDefaultConfig('app_server', 'app') };
    const engine = new SysSimEngine({ nodes: [client, app], edges: [] });
    engine.start();
    const before = createSimRequest('client', 0, 'before', 1);
    engine.processRequest(before);
    expect(before.path.map((hop) => hop.nodeId)).toEqual(['client']);
    engine.setGraph({
      nodes: [client, app],
      edges: [
        {
          id: 'route',
          source: 'client',
          target: 'app',
          data: { protocol: 'HTTP', purpose: 'request' },
        },
      ],
    });
    const after = createSimRequest('client', 1, 'after', 2);
    engine.processRequest(after);
    expect(after.path.map((hop) => hop.nodeId)).toEqual(['client', 'app']);
  });

  it('keeps rapid semantic edits monotonically revisioned', () => {
    const sync = vi.fn();
    configureGraphMutationListener(sync);
    const client = useStore.getState().addNode('client', { x: 0, y: 0 });
    const firstRevision = useStore.getState().graphRevision;
    const app = useStore.getState().addNode('app_server', { x: 100, y: 0 });
    const secondRevision = useStore.getState().graphRevision;
    useStore.getState().addEdge(client, app);
    const thirdRevision = useStore.getState().graphRevision;
    expect([firstRevision, secondRevision, thirdRevision]).toEqual([1, 2, 3]);
    expect(sync).toHaveBeenCalledTimes(3);
    expect(isCurrentGraphRevision(firstRevision, thirdRevision)).toBe(false);
    expect(isCurrentGraphRevision(secondRevision, thirdRevision)).toBe(false);
    expect(isCurrentGraphRevision(thirdRevision, thirdRevision)).toBe(true);
  });
});
