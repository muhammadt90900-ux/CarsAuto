/**
 * playwright.config.ts — CarsAuto E2E
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir:   './e2e',
  timeout:   30_000,
  retries:   process.env.CI ? 2 : 0,
  workers:   process.env.CI ? 2 : 4,
  reporter:  process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['html', { open: 'on-failure' }]],

  use: {
    baseURL:             BASE_URL,
    headless:            true,
    viewport:            { width: 1280, height: 720 },
    actionTimeout:       8_000,
    navigationTimeout:   15_000,
    screenshot:          'only-on-failure',
    video:               'retain-on-failure',
    trace:               'on-first-retry',
    // All E2E calls go to the running app — no API mocking
    ignoreHTTPSErrors:   true,
  },

  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
    {
      name:  'firefox',
      use:   { ...devices['Desktop Firefox'] },
    },
    {
      name:  'mobile-safari',
      use:   { ...devices['iPhone 13'] },
    },
    {
      name:  'mobile-chrome',
      use:   { ...devices['Pixel 5'] },
    },
  ],

  // Automatically start the Next.js dev server when running locally
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev --workspace=apps/web',
        url:     BASE_URL,
        timeout: 120_000,
        reuseExistingServer: true,
      },

  outputDir: 'playwright-results',
});
