import type { AnyComponentConfig, ProtocolEdgeData } from '../model/types';

export interface SimNode {
  id: string;
  config: AnyComponentConfig;
}

export interface SimEdge {
  id: string;
  source: string;
  target: string;
  data: ProtocolEdgeData;
}

export interface SimGraph {
  nodes: SimNode[];
  edges: SimEdge[];
}
