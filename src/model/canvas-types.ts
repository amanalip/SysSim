import type { Edge, Node } from '@xyflow/react';
import type {
  AnyComponentConfig,
  ProtocolEdgeData,
  SerializedCanvasState,
  ZoneData,
} from './types';

export interface CanvasNodeData extends Record<string, unknown> {
  config: AnyComponentConfig;
}

export type CanvasNode = Node<CanvasNodeData>;
export type CanvasEdge = Edge<ProtocolEdgeData> & { data: ProtocolEdgeData };

export interface CanvasHistoryEntry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  zones: ZoneData[];
}

export function toCanvasNodes(nodes: SerializedCanvasState['nodes']): CanvasNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'customComponent',
    position: node.position,
    data: node.data,
  }));
}

export function toCanvasEdges(edges: SerializedCanvasState['edges']): CanvasEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: 'protocolEdge',
    data: edge.data,
  }));
}
