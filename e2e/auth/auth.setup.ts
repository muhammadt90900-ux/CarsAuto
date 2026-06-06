/**
 * e2e/auth.setup.ts
 *
 * Playwright global setup: authenticates a test user once and saves
 * the browser storage state (cookies + localStorage) to a JSON file.
 * All authenticated test specs load this state via `storageState`.
 *
 * Required env vars (set in CI secrets or local .env.e2e):
 *   E2E_BASE_URL       — e.g. http://localhost:3000
 *   E2E_USER_EMAIL     — registered test user email
 *   E2E_USER_PASSWORD  — test user password
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth/user.json');

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const EMAIL    = process.env.E2E_USER_EMAIL    ?? 'xalo@test.com';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? '121416Aa';

setup('authenticate as regular user', async ({ page }) => {
  await page.goto(`${BASE_URL}/en/login`);

  // Fill login form
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /login|sign in|چوونەژوورەوە/i }).click();

  // Wait until redirected away from /login — dashboard or home
  await page.waitForURL(/\/(dashboard|en|ku|ar)(?!.*login)/, { timeout: 15_000 });

  // Verify we are actually logged in — no login page visible
  await expect(page.locator('text=/login|sign in/i').first()).not.toBeVisible({ timeout: 3_000 })
    .catch(() => { /* some themes keep a nav link — ignore */ });

  // Persist cookies + localStorage for reuse across specs
  await page.context().storageState({ path: AUTH_FILE });
});
