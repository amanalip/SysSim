import { expect, test } from '@playwright/test';
import LZString from 'lz-string';
import { createDefaultConfig } from '../src/model/component-defaults';

const nodes = [
  ['client', 'client', 40, 100],
  ['api_gateway', 'gateway', 220, 100],
  ['redis_cache', 'cache', 420, 40],
  ['app_server', 'app', 420, 160],
  ['sql_db', 'db', 640, 160],
].map(([type, id, x, y]) => ({
  id,
  type: 'customComponent',
  position: { x, y },
  data: {
    config: {
      ...createDefaultConfig(type as Parameters<typeof createDefaultConfig>[0], id as string),
      ...(id === 'db' ? { automaticFailover: true, readReplicasCount: 1, replicas: 2 } : {}),
    },
  },
}));
const edges = [
  ['ingress', 'client', 'gateway'],
  ['gateway-cache', 'gateway', 'cache'],
  ['gateway-app', 'gateway', 'app'],
  ['cache-app', 'cache', 'app'],
  ['app-db', 'app', 'db'],
].map(([id, source, target]) => ({
  id,
  source,
  target,
  type: 'protocolEdge',
  data: { protocol: 'HTTP', purpose: 'request', latencyMs: 10 },
}));

test('each targeted chaos drill injects and restores through the UI', async ({ page }) => {
  const state = LZString.compressToEncodedURIComponent(
    JSON.stringify({ version: 9, nodes, edges, zones: [] }),
  );
  await page.goto(`/#data=${state}`);
  await expect(page.getByTitle('Run targeted Chaos Engineering drills')).toBeVisible();
  await page.getByTitle('Run targeted Chaos Engineering drills').click();

  const drills = [
    ['Primary Database Outage', /failover path activated/i],
    ['Cache Stampede / Flush', /Caches bypassed/i],
    ['5x Flash Crowd Surge', /Offered base traffic changed once/i],
    ['Ingress Network Partition', /was partitioned/i],
    ['High Network Latency (400ms)', /Added 400ms/i],
  ] as const;

  for (const [name, result] of drills) {
    const card = page.locator('[class*="drillCard"]').filter({ hasText: name });
    await card.getByRole('button', { name: 'Launch Drill' }).click();
    await expect(page.locator('[class*="activeBanner"]')).toContainText(result);
    await page.getByRole('button', { name: /Restore System/i }).click();
    await expect(page.locator('[class*="activeBanner"]')).toHaveCount(0);
  }
});
