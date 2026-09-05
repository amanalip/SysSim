export type MotionPreference = 'system' | 'reduced';
export const motionPreferenceKey = 'syssim_motion_preference';

export function readStoredMotionPreference(): MotionPreference {
  try {
    return localStorage.getItem(motionPreferenceKey) === 'reduced' ? 'reduced' : 'system';
  } catch {
    return 'system';
  }
}
