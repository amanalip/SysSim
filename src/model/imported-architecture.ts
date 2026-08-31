import {
  assertAllowedKeys,
  assertSafeUntrustedValue,
  isPlainRecord,
} from '../security/untrusted-data';
import {
  ARCHITECTURE_LIMITS,
  ARCHITECTURE_ROOT_KEYS,
  validateArchitectureState,
} from './architecture-schema';
import { migrateCanvasState } from './canvas-migrations';
import type { SerializedCanvasState } from './types';

/** Raw transport shape. Fields remain unknown until the runtime boundary accepts them. */
export interface ImportedArchitectureDocument {
  version?: unknown;
  appVersion?: unknown;
  nodes?: unknown;
  edges?: unknown;
  zones?: unknown;
  trafficConfig?: unknown;
  simulationMetadata?: unknown;
}

function isMigrationEnvelope(
  value: unknown,
): value is SerializedCanvasState & Record<string, unknown> {
  return isPlainRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.edges);
}

export function parseImportedArchitecture(value: unknown): SerializedCanvasState {
  assertSafeUntrustedValue(value, {
    maxDepth: 8,
    maxEntries: 8_000,
    maxStringLength: ARCHITECTURE_LIMITS.maxTextLength,
  });
  if (!isMigrationEnvelope(value))
    throw new Error('Architecture must contain node and edge arrays');
  assertAllowedKeys(value, ARCHITECTURE_ROOT_KEYS, 'root');
  return validateArchitectureState(migrateCanvasState(value), { repairDanglingEdges: true });
}
