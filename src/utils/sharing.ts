import LZString from 'lz-string';
import { useStore } from '../store/use-store';
import { SerializedCanvasState, ZoneData } from '../model/types';
import { CURRENT_CANVAS_VERSION } from '../model/canvas-migrations';
import {
  APPLICATION_VERSION,
  ARCHITECTURE_LIMITS,
  formatArchitectureError,
} from '../model/architecture-schema';
import { toCanvasEdges, toCanvasNodes } from '../model/canvas-types';
import { parseImportedArchitecture } from '../model/imported-architecture';
import { byteLength, safeDownloadName } from '../security/untrusted-data';
import { AppError } from '../errors/app-error';
import { formatUtcDateForFilename } from '../platform/time';
import { SIMULATION_ENGINE_VERSION } from '../platform/build-info';

export const PRACTICAL_SHARE_URL_LENGTH = 8_000;
const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'secret',
  'apiKey',
  'credential',
  'privateKey',
  'accessToken',
  'refreshToken',
]);

export function findSensitiveShareFields(value: unknown, path = 'architecture'): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value))
    return value.flatMap((item, index) => findSensitiveShareFields(item, `${path}[${index}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    SENSITIVE_FIELD_NAMES.has(key)
      ? [`${path}.${key}`]
      : findSensitiveShareFields(item, `${path}.${key}`),
  );
}

export function serializeCanvasState(): SerializedCanvasState {
  const { nodes, edges, zones, trafficConfig } = useStore.getState();
  return {
    version: CURRENT_CANVAS_VERSION,
    appVersion: APPLICATION_VERSION,
    engineVersion: SIMULATION_ENGINE_VERSION,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? 'customComponent',
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
        lossRatePercent: e.data?.lossRatePercent,
        retryLimit: e.data?.retryLimit,
        connectionSetupMs: e.data?.connectionSetupMs,
        keepAlive: e.data?.keepAlive,
        crossZoneCostPerGb: e.data?.crossZoneCostPerGb,
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
    simulationMetadata: {
      savedAt: Date.now(),
      appVersion: APPLICATION_VERSION,
      engineVersion: SIMULATION_ENGINE_VERSION,
      state: useStore.getState().simState,
    },
  };
}

export function encodeStateToUrlHash(): string {
  const state = serializeCanvasState();
  const sensitiveFields = findSensitiveShareFields(state);
  if (sensitiveFields.length)
    throw new AppError(
      'user',
      `Share URL blocked because sensitive field ${sensitiveFields[0]} would be included`,
    );
  const jsonStr = JSON.stringify(state);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return `#data=${compressed}`;
}

export function decodeStateFromUrlHash(hash: string): SerializedCanvasState | null {
  try {
    if (!hash.startsWith('#data=')) return null;
    const compressed = hash.replace('#data=', '');
    if (compressed.length > ARCHITECTURE_LIMITS.maxImportBytes) return null;
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (!decompressed) return null;
    if (byteLength(decompressed) > ARCHITECTURE_LIMITS.maxDecompressedUrlBytes) return null;
    return parseImportedArchitecture(JSON.parse(decompressed));
  } catch {
    return null;
  }
}

export function exportArchitectureJson(baseName = 'syssim-architecture'): void {
  const state = serializeCanvasState();
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeDownloadName(`${baseName}-${formatUtcDateForFilename(Date.now())}`, 'json');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importArchitectureJson(
  file: File,
  onSuccess: () => void,
  onError: (msg: string) => void,
): void {
  readArchitectureJson(file)
    .then((migrated) => {
      applyImportedArchitecture(migrated);
      onSuccess();
    })
    .catch((error) => onError(formatArchitectureError(error)));
}

export function readArchitectureJson(file: File): Promise<SerializedCanvasState> {
  if (file.size > ARCHITECTURE_LIMITS.maxImportBytes) {
    return Promise.reject(
      new Error(
        `Architecture file exceeds the ${ARCHITECTURE_LIMITS.maxImportBytes.toLocaleString()} byte limit`,
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') throw new Error('Architecture file is not text');
        if (byteLength(content) > ARCHITECTURE_LIMITS.maxImportBytes)
          throw new Error('Architecture content exceeds the import size limit');
        resolve(parseImportedArchitecture(JSON.parse(content)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () =>
      reject(new Error('Persistence error: the architecture file could not be read'));
    reader.readAsText(file);
  });
}

export function applyImportedArchitecture(migrated: SerializedCanvasState): void {
  useStore
    .getState()
    .loadCanvasState(
      toCanvasNodes(migrated.nodes),
      toCanvasEdges(migrated.edges),
      (migrated.zones || []) as ZoneData[],
    );
  if (migrated.trafficConfig) {
    useStore.getState().setTrafficConfig(migrated.trafficConfig);
  }
}

export function getCanvasPngOptions(element: HTMLElement): {
  backgroundColor: string;
  pixelRatio: number;
  cacheBust: false;
  filter: (node: HTMLElement) => boolean;
} {
  return {
    backgroundColor:
      getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() ||
      '#0d1117',
    pixelRatio: Math.min(Math.max(window.devicePixelRatio || 1, 1), 2),
    cacheBust: false,
    filter: (node) => {
      if (node === element) return true;
      const className = typeof node.className === 'string' ? node.className : '';
      return ![
        'controlsBar',
        'particleLayer',
        'hudToolbar',
        'emptyCanvasNotice',
        'floatingToolbar',
      ].some((excludedClass) => className.includes(excludedClass));
    },
  };
}

export async function exportCanvasToPng(
  canvasElementId: string = 'syssim-canvas',
  baseName = 'syssim-architecture',
): Promise<void> {
  const element = document.getElementById(canvasElementId);
  if (!element) {
    throw new AppError('export', 'Canvas element not found for export');
  }

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(element, getCanvasPngOptions(element));

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = safeDownloadName(`${baseName}-${formatUtcDateForFilename(Date.now())}`, 'png');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
