import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureGraphMutationListener } from '../engine/simulation-command-bus';
import { createDefaultConfig } from '../model/component-defaults';
import {
  exportSnapshotSlots,
  importSnapshotSlots,
  parseSnapshotSlots,
  persistSnapshotSlots,
} from '../model/snapshot-storage';
import { useStore } from '../store/use-store';

describe('history and snapshot integrity tasks 237-253', () => {
  beforeEach(() => {
    configureGraphMutationListener(null);
    useStore.setState({
      nodes: [],
      edges: [],
      zones: [],
      historyPast: [],
      historyFuture: [],
      canUndo: false,
      canRedo: false,
      graphRevision: 0,
    });
  });

  it('records semantic actions, but not selection or movement frames', () => {
    const id = useStore.getState().addNode('app_server', { x: 0, y: 0 });
    const afterAdd = useStore.getState().historyPast.length;
    useStore.getState().selectNode(id);
    useStore.getState().updateNodePosition(id, { x: 5, y: 5 });
    expect(useStore.getState().historyPast).toHaveLength(afterAdd);
    useStore.getState().beginNodeDragHistory();
    useStore.getState().updateNodePosition(id, { x: 25, y: 30 });
    expect(useStore.getState().historyPast).toHaveLength(afterAdd + 1);
    useStore.getState().undo();
    expect(useStore.getState().nodes[0].position).toEqual({ x: 5, y: 5 });
  });

  it('groups rapid config edits and restores zones, edge semantics, and config', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const source = useStore.getState().addNode('client', { x: 0, y: 0 });
    const target = useStore.getState().addNode('app_server', { x: 100, y: 0 });
    useStore.getState().addEdge(source, target, 'gRPC', 'request');
    useStore.getState().addZone('Private', 'private', { x: 1, y: 2, width: 300, height: 200 });
    const beforeConfig = useStore.getState().historyPast.length;
    useStore.getState().updateNodeConfig(target, { processingLatencyMs: 25 });
    useStore.getState().updateNodeConfig(target, { processingLatencyMs: 35 });
    expect(useStore.getState().historyPast).toHaveLength(beforeConfig + 1);
    const zoneId = useStore.getState().zones[0].id;
    useStore.getState().updateZone(zoneId, { width: 450, x: 40 });
    expect(useStore.getState().zones[0]).toMatchObject({ width: 450, x: 40 });
    useStore.getState().undo();
    expect(useStore.getState().zones[0]).toMatchObject({ width: 300, x: 1 });
    expect(useStore.getState().edges[0].data).toMatchObject({
      protocol: 'gRPC',
      purpose: 'request',
    });
  });

  it('synchronizes undo and redo exactly once and exposes control availability', () => {
    const sync = vi.fn();
    configureGraphMutationListener(sync);
    useStore.getState().addNode('client', { x: 0, y: 0 });
    sync.mockClear();
    expect(useStore.getState().canUndo).toBe(true);
    useStore.getState().undo();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(useStore.getState().canUndo).toBe(false);
    expect(useStore.getState().canRedo).toBe(true);
    sync.mockClear();
    useStore.getState().redo();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(useStore.getState().canUndo).toBe(true);
    expect(useStore.getState().canRedo).toBe(false);
  });

  it('marks malformed and invalid persisted slots as corrupt and migrates old slots', () => {
    expect(parseSnapshotSlots('{broken')[0].corrupted).toBe(true);
    const old = [
      {
        id: 1,
        name: 'old',
        timestamp: 1,
        nodeCount: 1,
        edgeCount: 0,
        schemaVersion: 1,
        nodes: [
          {
            id: 'client',
            type: 'customComponent',
            position: { x: 0, y: 0 },
            data: { config: createDefaultConfig('client', 'client') },
          },
        ],
        edges: [],
      },
    ];
    const parsed = parseSnapshotSlots(JSON.stringify(old));
    expect(parsed[0]).toMatchObject({
      schemaVersion: 10,
      restorationMode: 'architecture-and-traffic-reset-simulation',
    });
    expect(parsed[0].corrupted).toBeFalsy();
    const invalid = [
      { ...old[0], nodes: [{ ...old[0].nodes[0], position: { x: Infinity, y: 0 } }] },
    ];
    expect(parseSnapshotSlots(JSON.stringify(invalid))[0].corrupted).toBe(true);
  });

  it('surfaces quota failures and round-trips all slots through portable JSON', () => {
    const slots = parseSnapshotSlots(null);
    const quota = new DOMException('full', 'QuotaExceededError');
    expect(() =>
      persistSnapshotSlots(
        {
          setItem: () => {
            throw quota;
          },
        },
        slots,
      ),
    ).toThrow('full');
    const exported = exportSnapshotSlots(slots);
    expect(importSnapshotSlots(exported)).toHaveLength(5);
    expect(() => importSnapshotSlots('{bad')).toThrow(/valid JSON/);
  });

  it('normalizes blank custom component names', () => {
    const id = useStore.getState().addNode('app_server', { x: 0, y: 0 }, '   ');
    expect(useStore.getState().nodes.find((item) => item.id === id)?.data.config.name).toBe(
      'App Server',
    );
  });
});
