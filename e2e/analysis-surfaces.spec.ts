import { expect, test } from '@playwright/test';
import { twoNodeArchitecture } from './helpers';

const analysisTabs = [
  {
    name: 'Bottleneck Inspector',
    snapshot: 'analysis-bottlenecks.png',
  },
  {
    name: '5-Pillar Health Radar',
    snapshot: 'analysis-health-radar.png',
  },
  {
    name: 'Distributed Traces',
    snapshot: 'analysis-distributed-traces.png',
  },
  {
    name: 'Cloud Cost Estimator',
    snapshot: 'analysis-cloud-cost.png',
  },
] as const;

test.describe('retained desktop analysis evidence', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium owns visual baselines.');

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(twoNodeArchitecture);
    await page
      .getByRole('button', { name: 'Open simulation metrics and telemetry dashboard' })
      .click();
    await expect(page.getByText('Simulation Metrics & Telemetry')).toBeVisible();
  });

  test('captures real-time chart and table views', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Real-Time Metrics' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('body')).toHaveScreenshot('analysis-real-time-charts.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.015,
    });

    await page.getByTitle('Toggle Charts or Table View').click();
    await expect(page.getByTitle('Toggle Charts or Table View')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('body')).toHaveScreenshot('analysis-real-time-table.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.015,
    });
  });

  for (const surface of analysisTabs) {
    test(`captures ${surface.name}`, async ({ page }) => {
      const tab = page.getByRole('tab', { name: surface.name });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await page.getByText('Loading telemetry view…', { exact: true }).waitFor({ state: 'hidden' });
      await expect(page.locator('body')).toHaveScreenshot(surface.snapshot, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.015,
      });
    });
  }
});
