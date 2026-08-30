import LZString from 'lz-string';
import { CanvasEdge, CanvasNode, useStore } from '../store/use-store';
import { SerializedCanvasState, ZoneData } from '../model/types';
import { CURRENT_CANVAS_VERSION, migrateCanvasState } from '../model/canvas-migrations';

export function serializeCanvasState(): SerializedCanvasState {
  const { nodes, edges, zones, trafficConfig } = useStore.getState();
  return {
    version: CURRENT_CANVAS_VERSION,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: {
        protocol: e.data?.protocol || 'HTTP',
        purpose: e.data?.purpose || 'request',
        bandwidthMbps: e.data?.bandwidthMbps,
        latencyMs: e.data?.latencyMs,
        isCut: !!e.data?.isCut,
      },
    })),
    zones: zones.map((z) => ({
      id: z.id,
      label: z.label,
      category: z.category,
      color: z.color,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
    })),
    trafficConfig: structuredClone(trafficConfig),
  };
}

export function encodeStateToUrlHash(): string {
  const state = serializeCanvasState();
  const jsonStr = JSON.stringify(state);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return `#data=${compressed}`;
}

export function decodeStateFromUrlHash(hash: string): SerializedCanvasState | null {
  try {
    if (!hash.startsWith('#data=')) return null;
    const compressed = hash.replace('#data=', '');
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return null;
    }
    return migrateCanvasState(parsed as SerializedCanvasState);
  } catch {
    return null;
  }
}

export function exportArchitectureJson(): void {
  const state = serializeCanvasState();
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `syssim_architecture_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importArchitectureJson(file: File, onSuccess: () => void, onError: (msg: string) => void): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content) as SerializedCanvasState;
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        onError('Invalid SysSim architecture JSON schema');
        return;
      }
      const migrated = migrateCanvasState(parsed);
      useStore.getState().loadCanvasState(
        migrated.nodes as unknown as CanvasNode[],
        migrated.edges as unknown as CanvasEdge[],
        (migrated.zones || []) as ZoneData[]
      );
      if (migrated.trafficConfig) {
        useStore.getState().setTrafficConfig(migrated.trafficConfig);
      }
      onSuccess();
    } catch {
      onError('Failed to parse architecture JSON file');
    }
  };
  reader.readAsText(file);
}

export async function exportCanvasToPng(canvasElementId: string = 'syssim-canvas'): Promise<void> {
  const element = document.getElementById(canvasElementId);
  if (!element) {
    throw new Error('Canvas element not found for export');
  }

  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, {
    backgroundColor: getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-primary')
      .trim() || '#0d1117',
    filter: (node) => {
      // Exclude controls, floating HUD, and particle overlay from static screenshot
      const className = typeof (node as HTMLElement).className === 'string' ? (node as HTMLElement).className : '';
      return (
        !className.includes('controlsBar') &&
        !className.includes('particleLayer') &&
        !className.includes('hudToolbar') &&
        !className.includes('emptyCanvasNotice') &&
        !className.includes('floatingToolbar')
      );
    },
  });

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `syssim_architecture_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
