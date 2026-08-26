import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';

describe('Bugs Batch 8: Floating Toolbar PreventDefault & Duplicate Edge Guard', () => {
  beforeEach(() => {
    useStore.setState({
      nodes: [],
      edges: [],
    });
  });

  it('Bug 20: addEdge prevents adding duplicate edges in reverse direction', () => {
    const { addNode, addEdge } = useStore.getState();
    const nodeA = addNode('client', { x: 50, y: 100 }, 'Client');
    const nodeB = addNode('app_server', { x: 250, y: 100 }, 'Server');

    const addedFirst = addEdge(nodeA, nodeB, 'HTTP');
    expect(addedFirst).toBe(true);
    expect(useStore.getState().edges.length).toBe(1);

    // Attempt to add duplicate forward edge
    const addedDup = addEdge(nodeA, nodeB, 'HTTP');
    expect(addedDup).toBe(false);
    expect(useStore.getState().edges.length).toBe(1);

    // Attempt to add duplicate reverse edge
    const addedReverse = addEdge(nodeB, nodeA, 'HTTP');
    expect(addedReverse).toBe(false);
    expect(useStore.getState().edges.length).toBe(1);
  });
});
