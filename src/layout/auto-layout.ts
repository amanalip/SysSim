import { CanvasEdge, CanvasNode, ZoneData } from '../store/use-store';

export function computeAutoLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  zones: ZoneData[] = []
): CanvasNode[] {
  if (nodes.length === 0) return [];

  // Map nodes to zones if originally contained
  const nodeZoneMap: Record<string, ZoneData | undefined> = {};
  nodes.forEach((node) => {
    const containingZone = zones.find(
      (z) =>
        node.position.x >= z.x &&
        node.position.x <= z.x + z.width &&
        node.position.y >= z.y &&
        node.position.y <= z.y + z.height
    );
    if (containingZone) {
      nodeZoneMap[node.id] = containingZone;
    }
  });

  // Build adjacency graph and calculate in-degrees
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  nodes.forEach((node) => {
    inDegree[node.id] = 0;
    adj[node.id] = [];
  });

  edges.forEach((edge) => {
    if (adj[edge.source] && inDegree[edge.target] !== undefined) {
      adj[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  });

  // Assign levels (ranks) using topological BFS
  const levels: Record<string, number> = {};
  const queue: string[] = [];

  // Root nodes (inDegree === 0) start at level 0
  nodes.forEach((node) => {
    if (inDegree[node.id] === 0) {
      levels[node.id] = 0;
      queue.push(node.id);
    }
  });

  // If cyclic or all inDegree > 0, fallback start with first node
  if (queue.length === 0 && nodes.length > 0) {
    levels[nodes[0].id] = 0;
    queue.push(nodes[0].id);
  }

  let iterations = 0;
  const maxIterations = nodes.length * 4;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;
    const currentLevel = levels[current] || 0;

    const neighbors = adj[current] || [];
    for (const next of neighbors) {
      const nextLevel = currentLevel + 1;
      if (nextLevel < nodes.length && (levels[next] === undefined || levels[next] < nextLevel)) {
        levels[next] = nextLevel;
        queue.push(next);
      }
    }
  }

  // Group nodes by level
  const nodesByLevel: Record<number, string[]> = {};
  nodes.forEach((node) => {
    const lvl = levels[node.id] !== undefined ? levels[node.id] : 0;
    if (!nodesByLevel[lvl]) {
      nodesByLevel[lvl] = [];
    }
    nodesByLevel[lvl].push(node.id);
  });

  // Assign geometric coordinates
  const levelKeys = Object.keys(nodesByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  const X_SPACING = 260;
  const Y_SPACING = 130;
  const START_X = 80;
  const START_Y = 100;

  const positions: Record<string, { x: number; y: number }> = {};

  levelKeys.forEach((lvl) => {
    const nodeIds = nodesByLevel[lvl];
    const totalHeight = (nodeIds.length - 1) * Y_SPACING;
    const startY = Math.max(START_Y, 300 - totalHeight / 2);

    nodeIds.forEach((id, idx) => {
      let targetX = START_X + lvl * X_SPACING;
      let targetY = startY + idx * Y_SPACING;

      const zone = nodeZoneMap[id];
      if (zone) {
        // Constrain inside zone boundary
        targetX = Math.max(zone.x + 20, Math.min(zone.x + zone.width - 160, targetX));
        targetY = Math.max(zone.y + 30, Math.min(zone.y + zone.height - 80, targetY));
      }

      positions[id] = {
        x: targetX,
        y: targetY,
      };
    });
  });

  return nodes.map((node) => ({
    ...node,
    position: positions[node.id] || node.position,
  }));
}
