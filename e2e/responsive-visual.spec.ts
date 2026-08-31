import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'tablet-1024x768', width: 1024, height: 768 },
  { name: 'compact-1280x720', width: 1280, height: 720 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
];

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
