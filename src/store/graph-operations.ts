import type { CanvasEdge, CanvasHistoryEntry, CanvasNode } from '../model/canvas-types';
import type { ZoneData } from '../model/types';

export function cloneGraphState(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  zones: ZoneData[],
): CanvasHistoryEntry {
  return structuredClone({ nodes, edges, zones });
}

export function removeGraphItemsPure(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  nodeIds: readonly string[],
  edgeIds: readonly string[],
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodeSet = new Set(nodeIds);
  const edgeSet = new Set(edgeIds);
  return {
    nodes: nodes.filter((node) => !nodeSet.has(node.id)),
    edges: edges.filter(
      (edge) => !edgeSet.has(edge.id) && !nodeSet.has(edge.source) && !nodeSet.has(edge.target),
    ),
  };
}

export function updateNodePositionPure(
  nodes: CanvasNode[],
  nodeId: string,
  position: { x: number; y: number },
): CanvasNode[] {
  return nodes.map((node) => (node.id === nodeId ? { ...node, position } : node));
}
