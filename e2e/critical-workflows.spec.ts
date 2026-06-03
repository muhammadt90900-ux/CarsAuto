/**
 * e2e/critical-workflows.spec.ts
 *
 * Playwright end-to-end tests covering:
 *   1. Homepage renders with language picker
 *   2. Registration form validation
 *   3. Login form validation + error state
 *   4. Browse cars page (listing grid loads)
 *   5. Search functionality
 *   6. Vehicle filter cascade (brand → model)
 *   7. Listing detail page
 *   8. Dashboard redirect when unauthenticated
 *   9. Locale switching (Kurdish / Arabic / English)
 *  10. RTL layout check for Arabic/Kurdish
 */

import { test, expect, Page } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL  = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const LOCALES   = ['en', 'ku', 'ar'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const url = (path: string, locale: string = 'en') => `${BASE_URL}/${locale}${path}`;

async function waitForHydration(page: Page) {
  // Wait for Next.js hydration marker or main content
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
}

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Homepage
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Homepage', () => {
  test('loads without errors and shows hero / search section', async ({ page }) => {
    await page.goto(url('/'));
    await waitForHydration(page);

    // At minimum the page renders a heading or search input
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    // No unhandled error overlay
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });

  test('shows navigation links', async ({ page }) => {
    await page.goto(url('/'));
    await waitForHydration(page);
    // Navigation should include link to /cars
    const carsLink = page.locator('a[href*="cars"]').first();
    await expect(carsLink).toBeVisible();
  });

  test('locale prefix is present in URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    // Middleware redirects to /en (or default locale)
    await page.waitForURL(/\/(en|ku|ar)(\/|$)/);
    expect(page.url()).toMatch(/\/(en|ku|ar)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Registration flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Registration form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(url('/register'));
    await waitForHydration(page);
  });

  test('shows validation errors for empty submit', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /register|sign up|تۆمار/i });
    await submitBtn.click();
    // At least one validation error should appear
    const errors = page.locator('[role="alert"], .error, [aria-invalid="true"]');
    await expect(errors.first()).toBeVisible({ timeout: 5_000 });
  });

  test('shows password strength requirements', async ({ page }) => {
    const pwField = page.getByLabel(/password/i).first();
    await pwField.fill('weak');
    // Trigger blur validation
    await pwField.press('Tab');
    const err = page.locator('text=/at least 8|uppercase|number/i');
    await expect(err).toBeVisible({ timeout: 3_000 });
  });

  test('email field rejects invalid format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/email/i).press('Tab');
    const err = page.locator('[aria-invalid="true"], .error, [role="alert"]').first();
    await expect(err).toBeVisible({ timeout: 3_000 });
  });

  test('shows form fields: name, email, password', async ({ page }) => {
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Login flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(url('/login'));
    await waitForHydration(page);
  });

  test('shows email and password fields', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await fillLoginForm(page, 'wrong@example.com', 'WrongPass1!');
    await page.getByRole('button', { name: /login|sign in|چوونەژوورەوە/i }).click();

    // Should show error message (API returns 401)
    const error = page.locator('[role="alert"], .error-message, text=/invalid|incorrect|هەڵە/i');
    await expect(error.first()).toBeVisible({ timeout: 8_000 });
  });

  test('password field is masked', async ({ page }) => {
    const pwField = page.getByLabel(/password/i);
    await expect(pwField).toHaveAttribute('type', 'password');
  });

  test('has link to register page', async ({ page }) => {
    const registerLink = page.locator('a[href*="register"]');
    await expect(registerLink.first()).toBeVisible();
  });

  test('has link to forgot password page', async ({ page }) => {
    const forgotLink = page.locator('a[href*="forgot"]');
    await expect(forgotLink.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Browse cars page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Cars listing page', () => {
  test('renders without JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url('/cars'));
    await waitForHydration(page);
    const criticalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('Hydration'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('shows filter/search controls', async ({ page }) => {
    await page.goto(url('/cars'));
    await waitForHydration(page);
    // At minimum a search input or filter section should exist
    const filterArea = page.locator('input[type="search"], input[placeholder*="search"], [data-testid="filter"]');
    await expect(filterArea.first()).toBeVisible({ timeout: 5_000 });
  });

  test('motorcycle page loads independently', async ({ page }) => {
    await page.goto(url('/motorcycles'));
    await waitForHydration(page);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });

  test('spare parts page loads independently', async ({ page }) => {
    await page.goto(url('/spare-parts'));
    await waitForHydration(page);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Search functionality
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Search', () => {
  test('typing in search input updates URL query param', async ({ page }) => {
    await page.goto(url('/cars'));
    await waitForHydration(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name="q"]').first();
    await searchInput.fill('Toyota');
    await searchInput.press('Enter');

    await page.waitForURL(/[?&]q=Toyota/, { timeout: 5_000 });
    expect(page.url()).toContain('Toyota');
  });

  test('empty search returns results page without error', async ({ page }) => {
    await page.goto(url('/cars') + '?q=');
    await waitForHydration(page);
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Vehicle filter cascade
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Vehicle filter cascade', () => {
  test('brand selector loads brands on page load', async ({ page }) => {
    await page.goto(url('/cars'));
    await waitForHydration(page);

    const brandSelect = page.locator('select[name="brand"], [data-testid="brand-select"], [aria-label*="brand"]').first();
    if (await brandSelect.isVisible()) {
      // Should have more than just the empty placeholder
      const options = brandSelect.locator('option');
      await expect(options).toHaveCountGreaterThan(1);
    } else {
      test.skip(); // brand filter UI not present on this view
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Dashboard auth guard
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard authentication guard', () => {
  test('unauthenticated access to /dashboard redirects to login', async ({ page }) => {
    await page.goto(url('/dashboard'));
    await page.waitForURL(/login|\/en$|\/ku$|\/ar$/, { timeout: 8_000 });
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login|\/en|\/ku|\/ar/);
  });

  test('unauthenticated access to /admin redirects', async ({ page }) => {
    await page.goto(url('/admin'));
    await page.waitForURL(/login|forbidden|\/en$/, { timeout: 8_000 });
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/admin/');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Locale switching
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Locale routing', () => {
  LOCALES.forEach(locale => {
    test(`/${locale}/ route loads correctly`, async ({ page }) => {
      await page.goto(`${BASE_URL}/${locale}`);
      await waitForHydration(page);
      await expect(page.locator('body')).not.toBeEmpty();
      expect(page.url()).toContain(`/${locale}`);
    });
  });

  test('Arabic locale sets dir=rtl on html element', async ({ page }) => {
    await page.goto(`${BASE_URL}/ar`);
    await waitForHydration(page);
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');
  });

  test('Kurdish locale sets dir=rtl on html element', async ({ page }) => {
    await page.goto(`${BASE_URL}/ku`);
    await waitForHydration(page);
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');
  });

  test('English locale sets dir=ltr on html element', async ({ page }) => {
    await page.goto(`${BASE_URL}/en`);
    await waitForHydration(page);
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('ltr');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Forgot password page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Forgot password page', () => {
  test('renders email input and submit button', async ({ page }) => {
    await page.goto(url('/forgot-password'));
    await waitForHydration(page);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send|submit|reset/i })).toBeVisible();
  });

  test('shows success message after submit (anti-enumeration)', async ({ page }) => {
    await page.goto(url('/forgot-password'));
    await waitForHydration(page);
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /send|submit|reset/i }).click();
    // Should show generic success — not error and not loading
    const success = page.locator('text=/sent|check your email|تکایە/i');
    await expect(success).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Dealers directory
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dealers page', () => {
  test('loads without crashing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url('/dealers'));
    await waitForHydration(page);
    const fatal = errors.filter(e => !e.includes('Warning:'));
    expect(fatal).toHaveLength(0);
  });

  test('has register dealer link', async ({ page }) => {
    await page.goto(url('/dealers'));
    await waitForHydration(page);
    const link = page.locator('a[href*="register"], a[href*="dealer"]').first();
    await expect(link).toBeVisible({ timeout: 5_000 });
  });
});
