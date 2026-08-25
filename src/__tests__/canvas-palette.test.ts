import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import { COMPONENT_METADATA_LIST } from '../model/component-defaults';

describe('Canvas & Component Palette Tests (Milestone 2)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
  });

  it('adds a component node to the canvas store', () => {
    const id = useStore.getState().addNode('app_server', { x: 100, y: 150 });
    const nodes = useStore.getState().nodes;

    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe(id);
    expect(nodes[0].position).toEqual({ x: 100, y: 150 });
    expect(nodes[0].data.config.type).toBe('app_server');
    expect(nodes[0].data.config.category).toBe('compute');
  });

  it('supports selecting and removing nodes', () => {
    const id = useStore.getState().addNode('sql_db', { x: 200, y: 200 });
    expect(useStore.getState().nodes.length).toBe(1);

    useStore.getState().selectNode(id);
    expect(useStore.getState().selectedNodeId).toBe(id);

    useStore.getState().removeNode(id);
    expect(useStore.getState().nodes.length).toBe(0);
    expect(useStore.getState().selectedNodeId).toBeNull();
  });

  it('supports undo and redo on node actions', () => {
    const id1 = useStore.getState().addNode('client', { x: 50, y: 50 });
    expect(useStore.getState().nodes.length).toBe(1);

    useStore.getState().undo();
    expect(useStore.getState().nodes.length).toBe(0);

    useStore.getState().redo();
    expect(useStore.getState().nodes.length).toBe(1);
    expect(useStore.getState().nodes[0].id).toBe(id1);
  });

  it('contains valid icon definitions for all 27 components', () => {
    COMPONENT_METADATA_LIST.forEach((meta) => {
      expect(meta.iconName).toBeDefined();
      expect(meta.category).toBeDefined();
      expect(meta.name).toBeDefined();
    });
  });
});
