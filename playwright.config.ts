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
    ignoreHTTPSErrors:   true,
  },

  projects: [
    // ── Auth setup — runs once before all authenticated specs ──────────────
    {
      name:     'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // ── Unauthenticated tests (no dependency on setup) ─────────────────────
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
      testIgnore: /authenticated-workflows/,
    },
    {
      name:  'firefox',
      use:   { ...devices['Desktop Firefox'] },
      testIgnore: /authenticated-workflows/,
    },
    {
      name:  'mobile-safari',
      use:   { ...devices['iPhone 13'] },
      testIgnore: /authenticated-workflows/,
    },
    {
      name:  'mobile-chrome',
      use:   { ...devices['Pixel 5'] },
      testIgnore: /authenticated-workflows/,
    },

    // ── Authenticated tests — depend on setup ──────────────────────────────
    {
      name:         'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch:    /authenticated-workflows/,
    },
    {
      name:         'mobile-auth',
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch:    /authenticated-workflows/,
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
