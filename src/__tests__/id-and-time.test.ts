import { afterEach, describe, expect, it } from 'vitest';
import { createId, setIdEntropySource } from '../platform/id';
import { formatTimestamp, formatUtcDateForFilename, SemanticSequence } from '../platform/time';

describe('IDs and explicit time handling', () => {
  afterEach(() => setIdEntropySource());

  it('supports collision-resistant production IDs and deterministic test injection', () => {
    const first = createId('node');
    const second = createId('node');
    expect(first).not.toBe(second);
    let sequence = 0;
    setIdEntropySource(() => `fixture-${++sequence}`);
    expect(createId('edge')).toBe('edge_fixture-1');
    expect(createId('edge')).toBe('edge_fixture-2');
  });

  it('makes locale and timezone expectations explicit', () => {
    const instant = Date.UTC(2026, 0, 2, 3, 4, 5);
    expect(formatTimestamp(instant)).toContain('Jan');
    expect(formatUtcDateForFilename(instant)).toBe('2026-01-02');
  });

  it('provides semantic ordering for same-millisecond events', () => {
    const sequence = new SemanticSequence();
    expect(sequence.next(100)).toEqual({ wallTimeMs: 100, sequence: 0 });
    expect(sequence.next(100)).toEqual({ wallTimeMs: 100, sequence: 1 });
    expect(sequence.next(101)).toEqual({ wallTimeMs: 101, sequence: 0 });
  });
});
