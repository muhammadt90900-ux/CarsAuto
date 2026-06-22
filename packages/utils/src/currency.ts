// packages/utils/src/currency.ts
import { Currency } from '@cars-auto/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExchangeRates {
  base: 'USD';
  rates: Record<string, number>;
  updatedAt: string;
  source: 'live' | 'fallback';
}

// ─── Hoisted formatters ───────────────────────────────────────────────────────
// Intl.NumberFormat instances are expensive to construct — create once.

const CURRENCY_FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  IQD: new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  AED: new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }),
  CNY: new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
};

// IQD threshold: amounts >= 1,000,000 shown in thousands (e.g. "1,300 هزار دینار")
const IQD_THOUSAND_THRESHOLD = 1_000_000;

// ─── Core formatters ──────────────────────────────────────────────────────────

/**
 * Format a monetary amount using the standard locale-aware formatter.
 * Example: formatCurrency(1310000, 'IQD') → "١٬٣١٠٬٠٠٠ د.ع."
 */
export function formatCurrency(amount: number, currency: Currency): string {
  return CURRENCY_FORMATTERS[currency].format(amount);
}

/**
 * Format IQD amounts in thousands for compact display.
 * Example: formatIQDCompact(1310000, 'ar') → "1,310 ألف دينار"
 *          formatIQDCompact(1310000, 'ku') → "1,310 هەزار دینار"
 *          formatIQDCompact(1310000, 'en') → "1,310K IQD"
 */
export function formatIQDCompact(amount: number, locale: string): string {
  if (amount < IQD_THOUSAND_THRESHOLD) {
    return CURRENCY_FORMATTERS['IQD'].format(amount);
  }

  const thousands = Math.round(amount / 1000);
  const formatted = new Intl.NumberFormat(locale).format(thousands);

  if (locale === 'ar') return `${formatted} ألف دينار`;
  if (locale === 'ku') return `${formatted} هەزار دینار`;
  if (locale === 'zh') return `${formatted}千伊拉克第纳尔`;
  return `${formatted}K IQD`;
}

/**
 * Format an amount with live conversion shown in parentheses.
 *
 * Examples (user in Iraq, locale='ku'):
 *   formatWithLiveRate(15000, 'USD', 'IQD', rates, 'ku')
 *   → "$15,000 (19,500,000 د.ع.)"
 *
 *   formatWithLiveRate(1310000, 'IQD', 'USD', rates, 'en')
 *   → "١٬٣١٠٬٠٠٠ د.ع. ($1,000)"
 *
 * @param amount        - Amount in fromCurrency
 * @param fromCurrency  - The listing's original currency
 * @param toCurrency    - The user's preferred display currency
 * @param rates         - Live rates object from useExchangeRates
 * @param locale        - UI locale for compact IQD formatting
 */
export function formatWithLiveRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates,
  locale = 'en',
): string {
  const primary = formatCurrencyRaw(amount, fromCurrency);

  // No conversion needed
  if (fromCurrency === toCurrency) return primary;

  const converted = convertWithRates(amount, fromCurrency, toCurrency, rates);
  if (converted === null) return primary;

  const convertedFormatted =
    toCurrency === 'IQD'
      ? formatIQDCompact(converted, locale)
      : formatCurrencyRaw(converted, toCurrency);

  return `${primary} (${convertedFormatted})`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Format amount with currency symbol — handles currencies not in CURRENCY_FORMATTERS.
 */
function formatCurrencyRaw(amount: number, currency: string): string {
  if (currency in CURRENCY_FORMATTERS) {
    return CURRENCY_FORMATTERS[currency as Currency].format(amount);
  }
  // Fallback for unknown currencies
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convert amount using live rates. Returns null if conversion not possible.
 */
function convertWithRates(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates,
): number | null {
  const fromRate = rates.rates[from];
  const toRate = rates.rates[to];

  if (!fromRate || !toRate) return null;

  // Convert via USD base: from → USD → to
  const inUsd = amount / fromRate;
  const converted = inUsd * toRate;

  return Math.round(converted);
}
