import { expect, test } from '@playwright/test';
import { architectureUrl, twoNodeArchitecture } from './helpers';

test('adds by drag, connects nodes, and changes edge protocol', async ({ page }) => {
  await page.goto(architectureUrl([{ id: 'client', type: 'client', x: 80, y: 160 }]));
  const before = await page.locator('.react-flow__node').count();
  await page
    .locator('[title^="Click or drag to place App Server"]')
    .dragTo(page.locator('.react-flow__pane'), {
      targetPosition: { x: 600, y: 220 },
    });
  await expect(page.locator('.react-flow__node')).toHaveCount(before + 1);

  await page.goto(
    architectureUrl([
      { id: 'source', type: 'client', x: 80, y: 180 },
      { id: 'target', type: 'app_server', x: 620, y: 180 },
    ]),
  );
  const source = page.locator('.react-flow__node').first().locator('.react-flow__handle-right');
  const target = page.locator('.react-flow__node').last().locator('.react-flow__handle-left');
  await source.dragTo(target, { force: true });
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);

  await page.getByRole('button', { name: /Transport protocol: HTTP/ }).click();
  await page.getByRole('button', { name: 'UDP', exact: true }).click();
  await expect(page.getByRole('button', { name: /Transport protocol: UDP/ })).toBeVisible();
});

test('edits representative properties in every component category', async ({ page }) => {
  const components = [
    { id: 'compute', type: 'app_server' as const, name: 'Compute', x: 40, y: 60 },
    { id: 'network', type: 'load_balancer' as const, name: 'Network', x: 300, y: 60 },
    { id: 'storage', type: 'sql_db' as const, name: 'Storage', x: 560, y: 60 },
    { id: 'cache', type: 'redis_cache' as const, name: 'Cache', x: 40, y: 300 },
    { id: 'message', type: 'message_queue' as const, name: 'Message', x: 300, y: 300 },
    { id: 'security', type: 'rate_limiter' as const, name: 'Security', x: 560, y: 300 },
  ];
  await page.goto(architectureUrl(components));
  for (const component of components) {
    await page.getByTestId(`rf__node-${component.id}`).click();
    const input = page.getByRole('textbox', { name: 'Component Name' });
    await input.fill(`${component.name} Edited`);
    await expect(page.getByText(`${component.name} Edited`, { exact: true })).toBeVisible();
    await page.getByTitle('Close properties panel').click();
  }
});

test('runs the full lifecycle, receives worker metrics, and uses every analysis tab', async ({
  page,
}) => {
  await page.goto(twoNodeArchitecture);
  await page.getByRole('button', { name: /^Simulate$/ }).click();
  await expect(page.getByRole('button', { name: /^Pause$/ })).toBeVisible();
  await expect
    .poll(async () =>
      Number(
        (
          await page.getByText('Offered').locator('..').locator('span').first().textContent()
        )?.replace(/,/g, ''),
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: /^Pause$/ }).click();
  await expect(page.getByRole('button', { name: /^Simulate$/ })).toBeVisible();
  await page.getByRole('button', { name: /^Simulate$/ }).click();
  await expect(page.getByRole('button', { name: /^Pause$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Stop simulation' }).click();
  await page.getByTitle('Step forward by 1 tick').click();
  await page.getByTitle('Reset simulation metrics').click();

  await page.getByTitle('Click to open full Metrics & Telemetry Dashboard (M)').click();
  for (const tab of [
    'Real-Time Metrics',
    'Bottleneck Inspector',
    '5-Pillar Health Radar',
    'Distributed Traces',
    'Cloud Cost Estimator',
  ]) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
  }
});

test('injects and restores node and edge failures', async ({ page }) => {
  await page.goto(twoNodeArchitecture);
  await page.getByText('Touch Server', { exact: true }).click();
  await page.getByRole('button', { name: 'Down', exact: true }).click();
  await expect(page.getByTestId('rf__node-server').getByTitle('Status: down')).toBeVisible();
  await page.getByRole('button', { name: 'Healthy', exact: true }).click();
  await expect(page.getByTestId('rf__node-server').getByTitle('Status: healthy')).toBeVisible();
  await page.getByTitle('Close properties panel').click();
  await page.getByTitle('Cut connection (simulate network partition)').click({ force: true });
  await expect(page.getByText('Cut network connection')).toBeVisible();
  await page.getByTitle('Restore connection').click({ force: true });
  await expect(page.getByText('Restored network connection')).toBeVisible();
});

test('uses undo, redo, duplicate, delete, auto-layout, and keyboard shortcuts', async ({
  page,
}) => {
  await page.goto(twoNodeArchitecture);
  await page.getByText('Touch Server', { exact: true }).click();
  await page.keyboard.press('Control+d');
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.keyboard.press('Delete');
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await page.getByTitle('Topologically arrange components (L)').click();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: /Keyboard Shortcuts/i })).toBeVisible();
});
