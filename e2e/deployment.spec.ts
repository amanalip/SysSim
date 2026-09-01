import { expect, test } from '@playwright/test';
import { readdir } from 'node:fs/promises';
import { twoNodeArchitecture } from './helpers';

test('serves production assets, dynamic chunks, worker, favicon, and CSS under /SysSim/', async ({
  page,
  request,
}) => {
  const response = await page.goto('./');
  expect(response?.ok()).toBe(true);
  await expect(page.getByText('SysSim', { exact: true })).toBeVisible();

  const assets = await readdir('dist/assets');
  const required = [
    assets.find((name) => name.endsWith('.css')),
    assets.find((name) => name.includes('sim-worker') && name.endsWith('.js')),
    assets.find((name) => name.includes('core-') && name.endsWith('.js')),
  ];
  for (const asset of required) {
    expect(asset, `required production asset was not emitted`).toBeTruthy();
    const assetResponse = await request.get(`./assets/${asset}`);
    expect(assetResponse.ok(), asset).toBe(true);
  }
  expect((await request.get('./favicon.svg')).ok()).toBe(true);

  const resourceUrls = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name),
  );
  const applicationOrigin = new URL(page.url()).origin;
  expect(resourceUrls.filter((url) => new URL(url).origin === applicationOrigin)).toEqual(
    expect.arrayContaining([expect.stringContaining('/SysSim/assets/')]),
  );
  expect(
    resourceUrls.every((url) => !url.includes('/assets/') || url.includes('/SysSim/assets/')),
  ).toBe(true);
});

test('preserves shared hashes and exposes the Pages 404 recovery document', async ({
  page,
  request,
}) => {
  await page.goto(twoNodeArchitecture);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  expect(await page.evaluate(() => location.pathname)).toBe('/SysSim/');
  expect(await page.evaluate(() => location.hash)).toContain('#data=');

  const recovery = await request.get('./404.html');
  expect(recovery.ok()).toBe(true);
  const html = await recovery.text();
  expect(html).toContain('sessionStorage.redirect = location.href');
  expect(html).toContain("URL='/SysSim/'");
});
