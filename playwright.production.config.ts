import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/deployment.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['junit', { outputFile: 'reports/production-e2e.xml' }]]
    : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/SysSim/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'production-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/SysSim/',
    reuseExistingServer: !process.env.CI,
  },
});
