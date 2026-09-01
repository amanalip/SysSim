import { describe, expect, it, vi } from 'vitest';
import { restoreGitHubPagesRedirect } from '../platform/pages-redirect';

describe('GitHub Pages redirect recovery tasks 666-667', () => {
  it('restores a same-origin shared hash at the canonical base path', () => {
    const storage = {
      getItem: vi.fn(() => 'https://example.test/SysSim/direct/path?mode=qa#data=payload'),
      removeItem: vi.fn(),
    };
    const history = { replaceState: vi.fn() };
    expect(restoreGitHubPagesRedirect(storage, { origin: 'https://example.test' }, history)).toBe(
      true,
    );
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/SysSim/?mode=qa#data=payload');
    expect(storage.removeItem).toHaveBeenCalledWith('redirect');
  });

  it('rejects cross-origin and out-of-base redirects', () => {
    for (const saved of ['https://evil.test/SysSim/#data=x', 'https://example.test/other']) {
      const history = { replaceState: vi.fn() };
      expect(
        restoreGitHubPagesRedirect(
          { getItem: () => saved, removeItem: vi.fn() },
          { origin: 'https://example.test' },
          history,
        ),
      ).toBe(false);
      expect(history.replaceState).not.toHaveBeenCalled();
    }
  });
});
