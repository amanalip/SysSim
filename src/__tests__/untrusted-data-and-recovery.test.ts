import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../model/component-defaults';
import { parseImportedArchitecture } from '../model/imported-architecture';
import { parseSnapshotSlots } from '../model/snapshot-storage';
import { safeDownloadName } from '../security/untrusted-data';
import { decodeStateFromUrlHash } from '../utils/sharing';

const validDocument = () => ({
  version: 10 as const,
  nodes: [
    {
      id: 'client-1',
      type: 'customComponent',
      position: { x: 0, y: 0 },
      data: { config: createDefaultConfig('client', 'client-1') },
    },
  ],
  edges: [],
});

describe('untrusted architecture boundaries', () => {
  it('accepts a validated transport document and rejects unexpected fields', () => {
    expect(parseImportedArchitecture(validDocument()).nodes).toHaveLength(1);
    expect(() => parseImportedArchitecture({ ...validDocument(), unexpected: true })).toThrow(
      /unexpected field/,
    );
  });

  it('rejects prototype-polluting keys, excessive nesting, and render-exploding arrays', () => {
    const polluted = JSON.parse('{"nodes":[],"edges":[],"__proto__":{"admin":true}}');
    expect(() => parseImportedArchitecture(polluted)).toThrow(/forbidden key/);
    let nested: unknown = 'leaf';
    for (let index = 0; index < 12; index += 1) nested = { nested };
    expect(() => parseImportedArchitecture({ nodes: [], edges: [], nested })).toThrow();
    expect(() =>
      parseImportedArchitecture({ nodes: Array.from({ length: 101 }, () => ({})), edges: [] }),
    ).toThrow();
  });

  it('safely rejects malformed or oversized URL data and sanitizes filenames', () => {
    expect(decodeStateFromUrlHash('#data=not-valid-compressed-json')).toBeNull();
    expect(decodeStateFromUrlHash(`#data=${'x'.repeat(1_000_001)}`)).toBeNull();
    expect(safeDownloadName('../../ report\u0000', '../json')).toBe('report.json');
  });

  it('recovers corrupt persisted snapshots without throwing', () => {
    const slots = parseSnapshotSlots('{broken json');
    expect(slots).toHaveLength(5);
    expect(slots[0]).toMatchObject({ corrupted: true });
  });

  it('fuzzes deterministic malformed transport shapes without mutating prototypes', () => {
    const corpus: unknown[] = [null, true, 1, 'x', [], {}, { nodes: 'bad', edges: [] }];
    for (let index = 0; index < 100; index += 1) {
      corpus.push({
        nodes: [{ id: `node-${index}`, position: { x: Number.NaN, y: index }, data: {} }],
        edges: [{ source: index }],
      });
    }
    for (const candidate of corpus) expect(() => parseImportedArchitecture(candidate)).toThrow();
    expect(({} as { admin?: boolean }).admin).toBeUndefined();
  });
});
