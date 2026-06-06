// packages/utils/src/currency.ts
import { Currency } from '@auto-bazaar-pro/types';

// Hoist formatters — created once, not per function call.
// Intl.NumberFormat instances are expensive to construct.
const CURRENCY_FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  IQD: new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  AED: new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }),
  CNY: new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
};

export function formatCurrency(amount: number, currency: Currency): string {
  return CURRENCY_FORMATTERS[currency].format(amount);
}
