import { describe, it, expect, beforeEach } from 'vitest';
import { ALL_SCENARIOS, SCENARIO_CATEGORIES, getScenarioById, getScenarioBySlug } from '../scenarios';
import { useStore } from '../store/use-store';

describe('Scenarios Framework & Bundled Library Tests (Milestones 14 to 17)', () => {
  beforeEach(() => {
    useStore.getState().clearCanvas();
    useStore.getState().setCurrentScenario(null);
  });

  it('contains exactly 101 bundled scenarios across 15 categories', () => {
    expect(ALL_SCENARIOS.length).toBe(101);
    expect(SCENARIO_CATEGORIES.length).toBe(15);

    // Verify all scenario IDs are unique and sequential from 1 to 101
    const ids = ALL_SCENARIOS.map((s) => s.id).sort((a, b) => a - b);
    expect(ids[0]).toBe(1);
    expect(ids[100]).toBe(101);
    expect(new Set(ids).size).toBe(101);
  });

  it('every scenario has valid constraints, hints, references, and citations', () => {
    ALL_SCENARIOS.forEach((s) => {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.problemStatement.length).toBeGreaterThan(20);
      expect(s.constraints.targetQps).toBeGreaterThan(0);
      expect(s.constraints.availabilitySlaPercent).toBeGreaterThan(90);
      expect(s.hints.length).toBeGreaterThanOrEqual(2);
      expect(s.referenceDesign.nodes.length).toBeGreaterThan(0);
      expect(s.referenceDesign.edges.length).toBeGreaterThan(0);
      expect(s.discussionPoints.length).toBeGreaterThanOrEqual(1);
      expect(s.sources.length).toBeGreaterThanOrEqual(2);

      // Verify no em dashes in content
      expect(s.title).not.toContain('—');
      expect(s.problemStatement).not.toContain('—');
    });
  });

  it('looks up scenarios by ID and slug', () => {
    const tinyurl = getScenarioById(1);
    expect(tinyurl).toBeDefined();
    expect(tinyurl?.slug).toBe('url-shortener');

    const bySlug = getScenarioBySlug('url-shortener');
    expect(bySlug).toBeDefined();
    expect(bySlug?.id).toBe(1);
  });

  it('loads reference design cleanly into canvas store', () => {
    const scenario = ALL_SCENARIOS[0]; // URL Shortener
    useStore.getState().loadReferenceDesign(scenario.referenceDesign);

    const nodes = useStore.getState().nodes;
    const edges = useStore.getState().edges;

    expect(nodes.length).toBe(scenario.referenceDesign.nodes.length);
    expect(edges.length).toBe(scenario.referenceDesign.edges.length);
  });

  it('marks scenario completed and persists status', () => {
    expect(useStore.getState().completedScenarioIds.includes(1)).toBe(false);

    useStore.getState().markScenarioCompleted(1);
    expect(useStore.getState().completedScenarioIds.includes(1)).toBe(true);

    // Toggle back
    useStore.getState().markScenarioCompleted(1);
    expect(useStore.getState().completedScenarioIds.includes(1)).toBe(false);
  });
});
