import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readWorkspaceDraft,
  startWorkspaceAutosave,
  useDraftStatus,
  WORKSPACE_DRAFT_KEY,
  UNREADABLE_DRAFT_KEY,
} from '../store/workspace-draft';
import { useStore } from '../store/use-store';

describe('workspace recovery', () => {
  let dispose: (() => void) | undefined;
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({ nodes: [], edges: [], zones: [] });
  });
  afterEach(() => {
    dispose?.();
    dispose = undefined;
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
  });
  it('restores an intentionally empty canvas and the latest traffic settings', () => {
    dispose = startWorkspaceAutosave();
    useStore.getState().setTrafficConfig({ baseQps: 1234 });
    vi.advanceTimersByTime(500);
    expect(readWorkspaceDraft()).toMatchObject({
      nodes: [],
      edges: [],
      trafficConfig: { baseQps: 1234 },
    });
    expect(useDraftStatus.getState().status).toBe('Saved locally');
  });
  it('flushes pending edits on pagehide and removes a now-stale share hash', () => {
    window.history.replaceState(null, '', '/#data=original');
    dispose = startWorkspaceAutosave();
    expect(window.location.hash).toBe('#data=original');
    useStore.getState().setTrafficConfig({ baseQps: 2345 });
    window.dispatchEvent(new Event('pagehide'));
    expect(readWorkspaceDraft()?.trafficConfig?.baseQps).toBe(2345);
    expect(window.location.hash).toBe('');
  });
  it('does not claim success or overwrite a previous draft when storage fails', () => {
    dispose = startWorkspaceAutosave();
    const previous = localStorage.getItem(WORKSPACE_DRAFT_KEY);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    useStore.getState().setTrafficConfig({ baseQps: 3456 });
    vi.advanceTimersByTime(500);
    expect(useDraftStatus.getState().status).toContain('Local save failed');
    expect(localStorage.getItem(WORKSPACE_DRAFT_KEY)).toBe(previous);
  });
  it('rejects corrupted drafts', () => {
    localStorage.setItem(WORKSPACE_DRAFT_KEY, '{"nodes":"invalid"}');
    expect(() => readWorkspaceDraft()).toThrow();
    expect(localStorage.getItem(UNREADABLE_DRAFT_KEY)).toBe('{"nodes":"invalid"}');
  });
  it('does not write on simulation telemetry updates', () => {
    dispose = startWorkspaceAutosave();
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    useStore.getState().setSimulationTiming(1000, Date.now());
    useStore.getState().updateMetrics({ totalRequestsSent: 10 });
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
  });
});
