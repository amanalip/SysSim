const REDIRECT_KEY = 'redirect';
const APPLICATION_BASE_PATH = '/SysSim/';

export function restoreGitHubPagesRedirect(
  storage: Pick<Storage, 'getItem' | 'removeItem'> = sessionStorage,
  currentLocation: Pick<Location, 'origin'> = window.location,
  navigation: Pick<History, 'replaceState'> = window.history,
): boolean {
  const saved = storage.getItem(REDIRECT_KEY);
  if (!saved) return false;
  storage.removeItem(REDIRECT_KEY);
  try {
    const original = new URL(saved, currentLocation.origin);
    if (
      original.origin !== currentLocation.origin ||
      !original.pathname.startsWith(APPLICATION_BASE_PATH)
    )
      return false;
    navigation.replaceState(null, '', `${APPLICATION_BASE_PATH}${original.search}${original.hash}`);
    return true;
  } catch {
    return false;
  }
}
