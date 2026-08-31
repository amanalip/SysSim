export type ScenarioLearningMode = 'challenge' | 'reference';
export type ScenarioCompletionIntent = 'not-started' | 'in-progress' | 'self-reviewed' | 'complete';

export interface ScenarioProgress {
  scenarioId: number;
  mode: ScenarioLearningMode;
  revealedHintCount: number;
  notes: string;
  attempts: number;
  completedSteps: number[];
  completionIntent: ScenarioCompletionIntent;
  updatedAt: number;
}

export const SCENARIO_PROGRESS_STORAGE_KEY = 'syssim_scenario_progress_v1';
const MAX_NOTES = 10_000;

export function createScenarioProgress(scenarioId: number): ScenarioProgress {
  return {
    scenarioId,
    mode: 'challenge',
    revealedHintCount: 1,
    notes: '',
    attempts: 0,
    completedSteps: [],
    completionIntent: 'not-started',
    updatedAt: 0,
  };
}

export function validateScenarioProgress(value: unknown): ScenarioProgress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<ScenarioProgress>;
  if (!Number.isInteger(item.scenarioId) || Number(item.scenarioId) <= 0) return null;
  if (!['challenge', 'reference'].includes(String(item.mode))) return null;
  if (
    !Number.isInteger(item.revealedHintCount) ||
    Number(item.revealedHintCount) < 0 ||
    Number(item.revealedHintCount) > 100
  )
    return null;
  if (typeof item.notes !== 'string' || item.notes.length > MAX_NOTES) return null;
  if (
    !Number.isInteger(item.attempts) ||
    Number(item.attempts) < 0 ||
    Number(item.attempts) > 10_000
  )
    return null;
  if (
    !Array.isArray(item.completedSteps) ||
    item.completedSteps.some((step) => !Number.isInteger(step) || step < 1 || step > 5)
  )
    return null;
  if (
    !['not-started', 'in-progress', 'self-reviewed', 'complete'].includes(
      String(item.completionIntent),
    )
  )
    return null;
  if (typeof item.updatedAt !== 'number' || !Number.isFinite(item.updatedAt) || item.updatedAt < 0)
    return null;
  return {
    scenarioId: Number(item.scenarioId),
    mode: item.mode as ScenarioLearningMode,
    revealedHintCount: Number(item.revealedHintCount),
    notes: item.notes,
    attempts: Number(item.attempts),
    completedSteps: [...new Set(item.completedSteps)],
    completionIntent: item.completionIntent as ScenarioCompletionIntent,
    updatedAt: item.updatedAt,
  };
}

export function readScenarioProgress(
  storage:
    | (Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'removeItem'>>)
    | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): Record<number, ScenarioProgress> {
  if (!storage) return {};
  try {
    const raw = JSON.parse(storage.getItem(SCENARIO_PROGRESS_STORAGE_KEY) || '{}') as Record<
      string,
      unknown
    >;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      storage.removeItem?.(SCENARIO_PROGRESS_STORAGE_KEY);
      return {};
    }
    return Object.values(raw).reduce<Record<number, ScenarioProgress>>((result, value) => {
      const valid = validateScenarioProgress(value);
      if (valid) result[valid.scenarioId] = valid;
      return result;
    }, {});
  } catch {
    storage.removeItem?.(SCENARIO_PROGRESS_STORAGE_KEY);
    return {};
  }
}

export function writeScenarioProgress(
  progress: Record<number, ScenarioProgress>,
  storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined'
    ? undefined
    : localStorage,
): void {
  if (!storage) return;
  storage.setItem(SCENARIO_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}
