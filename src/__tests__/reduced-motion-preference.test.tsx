import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useReducedMotion } from '../components/useReducedMotion';
import { useStore } from '../store/use-store';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useStore.setState({ motionPreference: 'system' });
});

it('reacts to system changes and keeps an explicit reduction enabled', () => {
  let matches = false;
  let notify = () => {};
  const remove = vi.fn();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    () =>
      ({
        matches,
        addEventListener: (_event: string, listener: () => void) => {
          notify = listener;
        },
        removeEventListener: remove,
      }) as unknown as MediaQueryList,
  );
  useStore.setState({ motionPreference: 'system' });
  const { result, unmount } = renderHook(useReducedMotion);
  expect(result.current).toBe(false);
  act(() => {
    matches = true;
    notify();
  });
  expect(result.current).toBe(true);
  act(() => {
    useStore.setState({ motionPreference: 'reduced' });
    matches = false;
    notify();
  });
  expect(result.current).toBe(true);
  act(() => useStore.setState({ motionPreference: 'system' }));
  expect(result.current).toBe(false);
  unmount();
  expect(remove).toHaveBeenCalled();
});
