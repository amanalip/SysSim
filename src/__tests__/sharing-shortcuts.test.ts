import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/use-store';
import {
  encodeStateToUrlHash,
  decodeStateFromUrlHash,
  serializeCanvasState,
} from '../utils/sharing';

describe('Sharing, Export & Keyboard Shortcuts Tests (Milestones 18 and 19)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
  });

  it('serializes, compresses to URL hash, and decompresses back accurately', () => {
    const nodeA = useStore.getState().addNode('client', { x: 100, y: 100 });
    const nodeB = useStore.getState().addNode('app_server', { x: 300, y: 100 });
    useStore.getState().addEdge(nodeA, nodeB, 'HTTP');

    const serialized = serializeCanvasState();
    expect(serialized.nodes.length).toBe(2);
    expect(serialized.edges.length).toBe(1);

    const hash = encodeStateToUrlHash();
    expect(hash.startsWith('#data=')).toBe(true);

    const decoded = decodeStateFromUrlHash(hash);
    expect(decoded).toBeDefined();
    expect(decoded?.nodes.length).toBe(2);
    expect(decoded?.edges.length).toBe(1);
    expect(decoded?.nodes[0].data.config.type).toBe('client');
    expect(decoded?.nodes[1].data.config.type).toBe('app_server');
  });

  it('handles invalid or corrupted URL hash gracefully without crashing', () => {
    const corrupted = decodeStateFromUrlHash('#data=not_valid_compressed_payload_xyz');
    expect(corrupted).toBeNull();

    const empty = decodeStateFromUrlHash('');
    expect(empty).toBeNull();
  });
});
