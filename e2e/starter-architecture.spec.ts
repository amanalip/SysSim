import { expect, test } from '@playwright/test';

test('loads the starter architecture with its nodes and edges', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  await expect(page.locator('.react-flow__edge')).toHaveCount(4);
  await expect(page.getByText('User Browser', { exact: true })).toBeVisible();
  await expect(page.getByText('URL Mapping Store', { exact: true })).toBeVisible();
});

test('adds a component using the palette button', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.react-flow__node')).toHaveCount(5);

  await page.getByRole('button', { name: 'Add Client to canvas' }).click();

  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.getByText('Added Client to canvas')).toBeVisible();
});
