import { SerializedCanvasState } from '../model/types';

export interface ArchitectureComparison {
  sharedComponentTypes: string[];
  userOnlyComponentTypes: string[];
  referenceOnlyComponentTypes: string[];
  userNodeCount: number;
  referenceNodeCount: number;
  userEdgeCount: number;
  referenceEdgeCount: number;
  guidance: string;
}

export function compareArchitectures(
  user: SerializedCanvasState,
  reference: SerializedCanvasState,
): ArchitectureComparison {
  const userTypes = new Set(user.nodes.map((node) => node.data.config.type));
  const referenceTypes = new Set(reference.nodes.map((node) => node.data.config.type));
  return {
    sharedComponentTypes: [...userTypes].filter((type) => referenceTypes.has(type)).sort(),
    userOnlyComponentTypes: [...userTypes].filter((type) => !referenceTypes.has(type)).sort(),
    referenceOnlyComponentTypes: [...referenceTypes].filter((type) => !userTypes.has(type)).sort(),
    userNodeCount: user.nodes.length,
    referenceNodeCount: reference.nodes.length,
    userEdgeCount: user.edges.length,
    referenceEdgeCount: reference.edges.length,
    guidance:
      'Differences are discussion prompts, not correctness failures. Compare responsibilities, reachable paths, bottlenecks, and failure behavior rather than visual layout.',
  };
}
