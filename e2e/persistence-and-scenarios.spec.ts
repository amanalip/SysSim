import { expect, test } from '@playwright/test';
import { SCENARIO_CATEGORIES } from '../src/scenarios';
import { twoNodeArchitecture } from './helpers';

test('saves and restores a local architecture snapshot', async ({ page }) => {
  await page.goto(twoNodeArchitecture);
  await page.getByTitle('Manage multi-slot architecture snapshots').click();
  const slot = page.locator('[class*="slotCard"]').first();
  await slot.getByTitle('Save current canvas state to this slot').click();
  await expect(slot).toContainText('2 nodes');
  await page.getByRole('button', { name: 'Close snapshot manager' }).click();
  await page.getByRole('button', { name: 'Add Client to canvas' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.getByTitle('Manage multi-slot architecture snapshots').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator('[class*="slotCard"]')
    .first()
    .getByTitle('Load this snapshot onto canvas')
    .dispatchEvent('click');
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
});

test('exports and re-imports validated architecture JSON', async ({ page }) => {
  await page.goto(twoNodeArchitecture);
  const downloadPromise = page.waitForEvent('download');
  await page.getByTitle('Export architecture as JSON file').click();
  const download = await downloadPromise;
  const file = await download.path();
  expect(file).not.toBeNull();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTitle('Clear all components from canvas').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByTitle('Import architecture from JSON file').click();
  const chooser = await chooserPromise;
  await chooser.setFiles(file!);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect(page.getByText('Architecture JSON imported successfully')).toBeVisible();
});

test('generates and reloads a share URL', async ({ page }) => {
  await page.goto(twoNodeArchitecture);
  await page.getByTitle('Copy shareable link encoded with architecture state').click();
  await expect.poll(() => page.url()).toContain('#data=');
  const sharedUrl = page.url();
  await page.goto(sharedUrl);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await expect(page.getByText('Loaded shared architecture from URL').first()).toBeVisible();
});

test('searches for and loads a scenario reference architecture', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('101 System Design Scenarios (2)').click();
  const back = page.getByRole('button', { name: /Back to Scenarios/i });
  await expect(back).toBeVisible();
  await back.click();
  await page.getByRole('textbox', { name: 'Search scenarios' }).fill('YouTube');
  await page.getByRole('button', { name: /YouTube/i }).click();
  await expect(page.getByText(/YouTube/i).first()).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /Replace Canvas with Reference Architecture/i }).click();
  await expect(page.getByText(/Loaded Reference Architecture for/i)).toBeVisible();
});

test('opens a representative scenario from every category', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByTitle('101 System Design Scenarios (2)').click();
  const back = page.getByRole('button', { name: /Back to Scenarios/i });
  await expect(back).toBeVisible();
  await back.click();
  for (const category of SCENARIO_CATEGORIES) {
    await page
      .getByRole('combobox', { name: 'Filter scenarios by category' })
      .selectOption(category);
    const card = page.locator('[class*="scenarioCard"]').first();
    await expect(card).toContainText(category);
    await card.click();
    await expect(page.getByRole('button', { name: /Back to Scenarios/i })).toBeVisible();
    await page.getByRole('button', { name: /Back to Scenarios/i }).click();
  }
});

test('switches between dark and light themes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^(dark|light)$/);
  const initial = await page.locator('html').getAttribute('data-theme');
  await page
    .getByTitle(new RegExp(`Switch to ${initial === 'dark' ? 'Light' : 'Dark'} mode`))
    .click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    initial === 'dark' ? 'light' : 'dark',
  );
  await page
    .getByTitle(new RegExp(`Switch to ${initial === 'dark' ? 'Dark' : 'Light'} mode`))
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', initial!);
});
