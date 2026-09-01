import { test, expect } from '@playwright/test';
import LZString from 'lz-string';
import { createDefaultConfig } from '../src/model/component-defaults';
import { EdgePurpose, SerializedCanvasState } from '../src/model/types';

const cases: Array<{
  purpose: EdgePurpose;
  sourceType: Parameters<typeof createDefaultConfig>[0];
  targetType: Parameters<typeof createDefaultConfig>[0];
}> = [
  { purpose: 'request', sourceType: 'client', targetType: 'app_server' },
  { purpose: 'fallback', sourceType: 'redis_cache', targetType: 'sql_db' },
  { purpose: 'async', sourceType: 'app_server', targetType: 'message_queue' },
  { purpose: 'fanout', sourceType: 'app_server', targetType: 'worker' },
  { purpose: 'replication', sourceType: 'sql_db', targetType: 'object_storage' },
  { purpose: 'observability', sourceType: 'app_server', targetType: 'timeseries_db' },
];

for (const testCase of cases) {
  test(`loads, displays, and simulates a ${testCase.purpose} edge`, async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    const state: SerializedCanvasState = {
      version: 2,
      nodes: [
        {
          id: 'source',
          type: 'customComponent',
          position: { x: 120, y: 180 },
          data: { config: createDefaultConfig(testCase.sourceType, 'source', 'Source') },
        },
        {
          id: 'target',
          type: 'customComponent',
          position: { x: 500, y: 180 },
          data: { config: createDefaultConfig(testCase.targetType, 'target', 'Target') },
        },
      ],
      edges: [
        {
          id: 'edge',
          source: 'source',
          target: 'target',
          data: {
            protocol: testCase.purpose === 'async' ? 'pub/sub' : 'HTTP',
            purpose: testCase.purpose,
          },
        },
      ],
    };
    const hash = LZString.compressToEncodedURIComponent(JSON.stringify(state));
    await page.goto(`./#data=${hash}`);

    await expect(
      page.getByRole('button', { name: new RegExp(`Edge purpose: ${testCase.purpose}`) }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Simulate$/ }).click();
    await expect(page.getByRole('button', { name: /^Pause$/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}
