import { afterEach, expect, it, vi } from 'vitest';
import { readStoredMotionPreference, motionPreferenceKey } from '../store/motion-preference';
import { useStore } from '../store/use-store';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(motionPreferenceKey);
  useStore.setState({ motionPreference: 'system' });
});

it.each(['system', 'reduced'] as const)('persists and restores %s', (preference) => {
  useStore.getState().setMotionPreference(preference);
  expect(readStoredMotionPreference()).toBe(preference);
  expect(localStorage.getItem(motionPreferenceKey)).toBe(preference);
});
it('falls back for missing, invalid, and inaccessible storage', () => {
  localStorage.removeItem(motionPreferenceKey);
  expect(readStoredMotionPreference()).toBe('system');
  localStorage.setItem(motionPreferenceKey, 'invalid');
  expect(readStoredMotionPreference()).toBe('system');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(readStoredMotionPreference()).toBe('system');
});
it('still updates motion when saving fails', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  useStore.getState().setMotionPreference('reduced');
  expect(useStore.getState().motionPreference).toBe('reduced');
});
