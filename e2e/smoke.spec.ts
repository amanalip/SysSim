import { test, expect } from '@playwright/test';

test('SysSim smoke test loads app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SysSim/);
  await expect(page.locator('text=SysSim').first()).toBeVisible();
});
