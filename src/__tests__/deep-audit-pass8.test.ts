import { describe, it, expect, beforeEach } from 'vitest';
import { ALL_SCENARIOS } from '../scenarios';
import { calculateCapacity } from '../analysis/capacity-calculator';
import { useStore } from '../store/use-store';

describe('Deep Audit Pass 8 Bug Fixes & Feature Tests (10+ Verifications)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().resetSimulation();
  });

  it('1. verifies scenario count matches exact 101 registered problems', () => {
    expect(ALL_SCENARIOS.length).toBe(101);
  });

  it('2. verifies scenario difficulties encompass Easy, Medium, and Hard', () => {
    const easyCount = ALL_SCENARIOS.filter((s) => s.difficulty === 'Easy').length;
    const medCount = ALL_SCENARIOS.filter((s) => s.difficulty === 'Medium').length;
    const hardCount = ALL_SCENARIOS.filter((s) => s.difficulty === 'Hard').length;

    expect(easyCount).toBeGreaterThan(0);
    expect(medCount).toBeGreaterThan(0);
    expect(hardCount).toBeGreaterThan(0);
    expect(easyCount + medCount + hardCount).toBe(101);
  });

  it('3. verifies all 101 scenarios have non-empty problem statements and valid hints', () => {
    ALL_SCENARIOS.forEach((s) => {
      expect(s.problemStatement.length).toBeGreaterThan(20);
      expect(s.hints.length).toBeGreaterThan(0);
      expect(s.referenceDesign.nodes.length).toBeGreaterThan(0);
    });
  });

  it('4. verifies combined category and difficulty scenario filtering', () => {
    const matched = ALL_SCENARIOS.filter(
      (s) => s.category === 'Core / Classic' && s.difficulty === 'Easy'
    );
    expect(matched.length).toBeGreaterThan(0);
    matched.forEach((s) => {
      expect(s.category).toBe('Core / Classic');
      expect(s.difficulty).toBe('Easy');
    });
  });

  it('5. verifies scenario search query matches case-insensitive titles', () => {
    const results = ALL_SCENARIOS.filter((s) =>
      s.title.toLowerCase().includes('rate limiter')
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain('rate limiter');
  });

  it('6. verifies Chat Messaging preset calculations in EnvelopeCalculator', () => {
    const output = calculateCapacity({ ...useStore.getState().calculatorInputs, qps: 20000, payloadSizeKb: 4, readWriteRatio: 2 });
    expect(output.writeQps).toBeCloseTo(6666.67, 1);
    expect(output.dailyNewDataGb).toBeGreaterThan(0);
  });

  it('7. verifies Video Streaming media-heavy bandwidth calculations', () => {
    const output = calculateCapacity({ ...useStore.getState().calculatorInputs, qps: 10000, payloadSizeKb: 500, readWriteRatio: 100, readResponsePayloadKb: 500 });
    expect(output.outboundBandwidthMbps).toBeGreaterThan(39000);
  });

  it('8. verifies E-Commerce standard architecture preset settings', () => {
    const output = calculateCapacity({ ...useStore.getState().calculatorInputs, qps: 15000, serverCapacityQps: 1000 });
    expect(output.estimatedServersNeeded).toBe(30);
  });

  it('9. verifies sidebar tab switching transitions state store properly', () => {
    useStore.getState().setActiveSidebarTab('palette');
    expect(useStore.getState().activeSidebarTab).toBe('palette');

    useStore.getState().setActiveSidebarTab('scenarios');
    expect(useStore.getState().activeSidebarTab).toBe('scenarios');

    useStore.getState().setActiveSidebarTab('calculator');
    expect(useStore.getState().activeSidebarTab).toBe('calculator');
  });

  it('10. verifies all scenarios have reference design nodes with valid positions', () => {
    ALL_SCENARIOS.forEach((s) => {
      s.referenceDesign.nodes.forEach((n) => {
        expect(n.position).toBeDefined();
        expect(typeof n.position.x).toBe('number');
        expect(typeof n.position.y).toBe('number');
      });
    });
  });
});
