import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_SCHEMA_VERSION,
  SUPPORTED_EDGE_PROTOCOLS,
  validateArchitectureState,
} from '../model/architecture-schema';
import { COMPONENT_METADATA_LIST, createDefaultConfig } from '../model/component-defaults';
import type { EdgeProtocol } from '../model/types';
import { getComponentExecutionKind } from '../engine/component-execution-kind';

describe('runtime schema and TypeScript synchronization', () => {
  it('accepts every shared component definition and exhaustively classifies execution', () => {
    for (const [index, metadata] of COMPONENT_METADATA_LIST.entries()) {
      const id = `node-${index}`;
      const config = createDefaultConfig(metadata.type, id);
      expect(getComponentExecutionKind(config.type)).toBeTruthy();
      expect(
        validateArchitectureState({
          version: ARCHITECTURE_SCHEMA_VERSION,
          nodes: [{ id, type: 'customComponent', position: { x: index, y: 0 }, data: { config } }],
          edges: [],
        }).nodes[0].data.config.type,
      ).toBe(metadata.type);
    }
  });

  it('keeps the runtime protocol list assignable to EdgeProtocol', () => {
    const protocols: readonly EdgeProtocol[] = SUPPORTED_EDGE_PROTOCOLS;
    expect(protocols).toEqual(['HTTP', 'gRPC', 'WebSocket', 'TCP', 'UDP', 'pub/sub', 'MQTT']);
  });
});
