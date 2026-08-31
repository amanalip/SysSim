import LZString from 'lz-string';
import { createDefaultConfig } from '../src/model/component-defaults';
import { ComponentType, SerializedCanvasState } from '../src/model/types';

export function architectureUrl(
  components: Array<{ id: string; type: ComponentType; name?: string; x: number; y: number }>,
  edges: SerializedCanvasState['edges'] = [],
): string {
  const state: SerializedCanvasState = {
    version: 10,
    appVersion: '1.0.0',
    nodes: components.map(({ id, type, name, x, y }) => ({
      id,
      type: 'customComponent',
      position: { x, y },
      data: { config: createDefaultConfig(type, id, name) },
    })),
    edges,
    zones: [],
  };
  return `/#data=${LZString.compressToEncodedURIComponent(JSON.stringify(state))}`;
}

export const twoNodeArchitecture = architectureUrl(
  [
    { id: 'client', type: 'client', name: 'Touch Client', x: 100, y: 180 },
    { id: 'server', type: 'app_server', name: 'Touch Server', x: 520, y: 180 },
  ],
  [
    {
      id: 'edge',
      source: 'client',
      target: 'server',
      data: { protocol: 'HTTP', purpose: 'request' },
    },
  ],
);
