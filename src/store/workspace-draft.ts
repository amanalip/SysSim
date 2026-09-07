import { create } from 'zustand';
import { useStore } from './use-store';
import { serializeCanvasState } from '../utils/sharing';
import { parseImportedArchitecture } from '../model/imported-architecture';
import { ARCHITECTURE_LIMITS } from '../model/architecture-schema';
import { byteLength } from '../security/untrusted-data';

export const WORKSPACE_DRAFT_KEY = 'syssim_workspace_draft_v1';
export const useDraftStatus = create<{ status: string }>(() => ({
  status: 'Preparing local save…',
}));

export function readWorkspaceDraft() {
  const raw = localStorage.getItem(WORKSPACE_DRAFT_KEY);
  if (raw === null) return null;
  if (byteLength(raw) > ARCHITECTURE_LIMITS.maxImportBytes)
    throw new Error('Draft exceeds size limit');
  return parseImportedArchitecture(JSON.parse(raw));
}

export function startWorkspaceAutosave() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let previous = '';
  let dirty = true;
  let edited = false;
  const save = () => {
    clearTimeout(timer);
    if (!dirty) return;
    try {
      const state = serializeCanvasState();
      delete state.simulationMetadata;
      const raw = JSON.stringify(state);
      if (raw !== previous) {
        if (byteLength(raw) > ARCHITECTURE_LIMITS.maxImportBytes)
          throw new Error('Draft exceeds size limit');
        // Validate before replacing the last recoverable draft.
        parseImportedArchitecture(JSON.parse(raw));
        localStorage.setItem(WORKSPACE_DRAFT_KEY, raw);
        previous = raw;
      }
      if (edited && window.location.hash.startsWith('#data=')) {
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + window.location.search,
        );
      }
      dirty = false;
      useDraftStatus.setState({ status: 'Saved locally' });
    } catch {
      useDraftStatus.setState({ status: 'Local save failed — export JSON to keep your work' });
    }
  };
  const unsubscribe = useStore.subscribe((next, prev) => {
    if (
      next.nodes === prev.nodes &&
      next.edges === prev.edges &&
      next.zones === prev.zones &&
      next.trafficConfig === prev.trafficConfig
    )
      return;
    dirty = true;
    edited = true;
    useDraftStatus.setState({ status: 'Saving locally…' });
    clearTimeout(timer);
    timer = setTimeout(save, 500);
  });
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') save();
  };
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', onVisibility);
  save();
  return () => {
    save();
    clearTimeout(timer);
    unsubscribe();
    window.removeEventListener('pagehide', save);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
