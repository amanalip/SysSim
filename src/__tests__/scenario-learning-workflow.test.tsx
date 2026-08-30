import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ScenarioDetail } from '../components/scenarios/ScenarioDetail';
import { ALL_SCENARIOS } from '../scenarios';
import { compareArchitectures } from '../scenarios/compare';
import {
  createScenarioProgress,
  readScenarioProgress,
  writeScenarioProgress,
} from '../scenarios/progress';
import { useStore } from '../store/use-store';

describe('scenario learning workflow', () => {
  const scenario = ALL_SCENARIOS[0];

  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      nodes: [],
      edges: [],
      scenarioProgress: {},
      completedScenarioIds: [],
      showReferenceOverlay: false,
      sideBySideMode: false,
    });
  });

  it('round-trips validated local learning progress', () => {
    const progress = {
      ...createScenarioProgress(scenario.id),
      revealedHintCount: 2,
      completedSteps: [1, 3],
      notes: 'Compare the cache experiment.',
      attempts: 2,
    };

    writeScenarioProgress({ [scenario.id]: progress });

    expect(readScenarioProgress()[scenario.id]).toEqual(progress);
  });

  it('rejects malformed persisted progress', () => {
    localStorage.setItem('syssim_scenario_progress_v1', '{"1":{"scenarioId":"bad"}}');
    expect(readScenarioProgress()).toEqual({});
  });

  it('keeps challenge browsing non-destructive and persists hints and notes', () => {
    render(<ScenarioDetail scenario={scenario} onBack={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /unlock next hint/i }));
    fireEvent.change(screen.getByLabelText(/private learning notes/i), {
      target: { value: 'Measure before and after.' },
    });

    expect(useStore.getState().nodes).toEqual([]);
    expect(useStore.getState().scenarioProgress[scenario.id]).toMatchObject({
      revealedHintCount: 2,
      notes: 'Measure before and after.',
    });
  });

  it('compares responsibilities neutrally without grading either design', () => {
    const comparison = compareArchitectures(
      { nodes: scenario.referenceDesign.nodes.slice(0, 1), edges: [] },
      scenario.referenceDesign,
    );

    expect(comparison.sharedComponentTypes.length).toBeGreaterThan(0);
    expect(comparison.guidance).toMatch(/not correctness failures/i);
  });
});
