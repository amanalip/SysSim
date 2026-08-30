import { SerializedCanvasState, TrafficConfig, ZoneData } from './types';
import { APPLICATION_VERSION, ARCHITECTURE_SCHEMA_VERSION, formatArchitectureError, validateArchitectureState } from './architecture-schema';
import { migrateCanvasState } from './canvas-migrations';

export const SNAPSHOT_STORAGE_KEY = 'syssim_architecture_snapshots';
export const SNAPSHOT_SLOT_COUNT = 5;

export interface SnapshotSlot {
  id: number;
  name: string;
  timestamp: number | null;
  nodeCount: number;
  edgeCount: number;
  schemaVersion: number;
  applicationVersion: string;
  restorationMode: 'architecture-and-traffic-reset-simulation';
  corrupted?: boolean;
  corruptionReason?: string;
  nodes?: SerializedCanvasState['nodes'];
  edges?: SerializedCanvasState['edges'];
  zones?: ZoneData[];
  trafficConfig?: TrafficConfig;
}

export function emptySnapshotSlot(id: number): SnapshotSlot {
  return {
    id,
    name: `Architecture Snapshot ${id}`,
    timestamp: null,
    nodeCount: 0,
    edgeCount: 0,
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    restorationMode: 'architecture-and-traffic-reset-simulation',
  };
}

export function parseSnapshotSlots(serialized: string | null): SnapshotSlot[] {
  if (!serialized) return Array.from({ length: SNAPSHOT_SLOT_COUNT }, (_, index) => emptySnapshotSlot(index + 1));
  let parsed: unknown;
  try { parsed = JSON.parse(serialized); } catch { return [{ ...emptySnapshotSlot(1), corrupted: true, corruptionReason: 'Stored snapshot JSON is malformed' }, ...Array.from({ length: 4 }, (_, index) => emptySnapshotSlot(index + 2))]; }
  if (!Array.isArray(parsed)) return [{ ...emptySnapshotSlot(1), corrupted: true, corruptionReason: 'Stored snapshot collection is not an array' }, ...Array.from({ length: 4 }, (_, index) => emptySnapshotSlot(index + 2))];
  const byId = new Map<number, SnapshotSlot>();
  parsed.slice(0, SNAPSHOT_SLOT_COUNT).forEach((candidate, index) => {
    const fallback = emptySnapshotSlot(index + 1);
    try {
      if (!candidate || typeof candidate !== 'object') throw new Error('Slot is not an object');
      const raw = candidate as Partial<SnapshotSlot>;
      const id = Number.isInteger(raw.id) && Number(raw.id) >= 1 && Number(raw.id) <= SNAPSHOT_SLOT_COUNT ? Number(raw.id) : index + 1;
      if (!raw.nodes || raw.nodes.length === 0) return byId.set(id, { ...fallback, id, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 120) : fallback.name });
      const state = validateArchitectureState(migrateCanvasState({
        version: raw.schemaVersion as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | undefined,
        nodes: raw.nodes,
        edges: raw.edges || [],
        zones: raw.zones || [],
        trafficConfig: raw.trafficConfig,
      }));
      byId.set(id, {
        ...fallback,
        ...raw,
        id,
        name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 120) : fallback.name,
        nodeCount: state.nodes.length,
        edgeCount: state.edges.length,
        nodes: state.nodes,
        edges: state.edges,
        zones: state.zones,
        trafficConfig: state.trafficConfig,
        schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
        applicationVersion: APPLICATION_VERSION,
        restorationMode: 'architecture-and-traffic-reset-simulation',
      });
    } catch (error) {
      byId.set(index + 1, { ...fallback, corrupted: true, corruptionReason: formatArchitectureError(error) });
    }
  });
  return Array.from({ length: SNAPSHOT_SLOT_COUNT }, (_, index) => byId.get(index + 1) || emptySnapshotSlot(index + 1));
}

export function persistSnapshotSlots(storage: Pick<Storage, 'setItem'>, slots: SnapshotSlot[]): void {
  storage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(slots));
}

export function exportSnapshotSlots(slots: SnapshotSlot[]): string {
  return JSON.stringify({
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    exportedAt: new Date().toISOString(),
    slots,
  }, null, 2);
}

export function importSnapshotSlots(serialized: string): SnapshotSlot[] {
  let parsed: unknown;
  try { parsed = JSON.parse(serialized); } catch { throw new Error('Snapshot import is not valid JSON'); }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { slots?: unknown }).slots)) {
    throw new Error('Snapshot import must contain a slots array');
  }
  const slots = parseSnapshotSlots(JSON.stringify((parsed as { slots: unknown[] }).slots));
  const corrupt = slots.find((slot) => slot.corrupted);
  if (corrupt) throw new Error(`Snapshot slot ${corrupt.id} is invalid: ${corrupt.corruptionReason}`);
  return slots;
}
