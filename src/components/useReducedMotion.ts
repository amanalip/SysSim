import { useSyncExternalStore } from 'react';
import { useStore } from '../store/use-store';

const query = '(prefers-reduced-motion: reduce)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

export function useReducedMotion() {
  const preference = useStore((state) => state.motionPreference);
  const systemReduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
  return preference === 'reduced' || systemReduced;
}
