import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'tablet-1024x768', width: 1024, height: 768 },
  { name: 'compact-1280x720', width: 1280, height: 720 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'large-desktop-1920x1080', width: 1920, height: 1080 },
];

test('keyboard, zoom, reduced-motion, and forced-color accessibility remain usable', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const firstNode = page.locator('.react-flow__node[role="button"]').first();
  await expect(firstNode).toBeVisible();
  await firstNode.focus();
  await expect(firstNode).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(firstNode).toHaveClass(/selected/);
  const before = await firstNode.getAttribute('style');
  await expect(firstNode).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => firstNode.getAttribute('style')).not.toBe(before);

  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.locator('#syssim-canvas')).toBeVisible();

  await page.emulateMedia(
    browserName === 'chromium'
      ? { reducedMotion: 'reduce', forcedColors: 'active' }
      : { reducedMotion: 'reduce' },
  );
  await expect(page.getByRole('region', { name: /architecture canvas/i })).toBeVisible();
});

test('mobile and tablet navigation supports touch-sized placement and property sheets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const tools = page.getByRole('button', { name: 'Open design tools' });
  await expect(tools).toBeVisible();
  await tools.click();
  await expect(page.getByRole('complementary', { name: 'Design tools' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Client to canvas' }).click();
  await expect(page.getByText('Properties', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Component Name' })).toBeVisible();
  await page.getByTitle('Close properties panel').click();
  await page.getByRole('button', { name: 'Close design tools' }).click();
  await page.getByText('Client', { exact: true }).last().click();
  await expect(page.getByRole('textbox', { name: 'Component Name' })).toBeVisible();
  await page.getByTitle('Close properties panel').click();

  await page.getByRole('button', { name: 'Architecture actions' }).click();
  await expect(page.getByTitle('Manage multi-slot architecture snapshots')).toBeVisible();
});

for (const viewport of viewports) {
  test(`visual baseline ${viewport.name}`, async ({ page, browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'Cross-engine release checks use behavioral assertions; visual baselines use Chromium.',
    );
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page.locator('#syssim-canvas')).toBeVisible();
    await expect(page.locator('body')).toHaveScreenshot(`${viewport.name}.png`, {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.015,
    });
  });
}
