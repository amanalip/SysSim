import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCanvasPngOptions } from '../utils/sharing';

describe('PNG theme and density options', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--bg-primary');
    vi.unstubAllGlobals();
  });

  it.each([
    ['dark', '#0d1117'],
    ['light', '#ffffff'],
  ])('uses the %s theme canvas token', (theme, color) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--bg-primary', color);
    const canvas = document.createElement('div');
    expect(getCanvasPngOptions(canvas).backgroundColor).toBe(color);
  });

  it('caps high-DPR exports at 2x to bound memory without falling below 1x', () => {
    vi.stubGlobal('devicePixelRatio', 4);
    expect(getCanvasPngOptions(document.createElement('div')).pixelRatio).toBe(2);
  });
});
