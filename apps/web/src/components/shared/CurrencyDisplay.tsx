// apps/web/src/components/shared/CurrencyDisplay.tsx
//
// Shows a monetary amount with optional live conversion in parentheses.
// Automatically uses the user's locale to pick secondary display currency.
//
// Usage:
//   <CurrencyDisplay amount={15000} currency="USD" locale="ku" showConverted />
//   → "$15,000 (١٩٬٥٠٠٬٠٠٠ د.ع.)"
//
//   <CurrencyDisplay amount={1310000} currency="IQD" locale="en" showConverted />
//   → "١٬٣١٠٬٠٠٠ د.ع. ($1,000)"

'use client';

import { useExchangeRates, ExchangeRates } from '@/hooks/useExchangeRates';
import { cn } from '@cars-auto/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CurrencyDisplayProps {
  amount: number;
  currency: string;
  locale?: string;
  /** If true, shows converted amount in parentheses based on locale */
  showConverted?: boolean;
  className?: string;
  /** CSS class for the conversion part */
  convertedClassName?: string;
}

// ─── Locale → preferred display currency mapping ──────────────────────────────

const LOCALE_CURRENCY: Record<string, keyof ExchangeRates['rates']> = {
  ku: 'IQD',
  ar: 'IQD',
  en: 'USD',
  zh: 'CNY',
};

// ─── IQD compact formatting ───────────────────────────────────────────────────

const IQD_FORMATTERS: Record<string, Intl.NumberFormat> = {
  ku: new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0 }),
  ar: new Intl.NumberFormat('ar-IQ', { maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }),
  zh: new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }),
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  IQD: 'د.ع.',
  AED: 'د.إ',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const FORMATTERS: Partial<Record<string, Intl.NumberFormat>> = {
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  IQD: new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }),
  AED: new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }),
  CNY: new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
};

function formatAmount(amount: number, currency: string): string {
  const formatter = FORMATTERS[currency];
  if (formatter) return formatter.format(amount);
  return `${CURRENCY_SYMBOLS[currency] ?? currency}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
}

/**
 * Format IQD in compact "thousands" style for large amounts.
 * 1,310,000 IQD → "١٬٣١٠ هەزار دینار" (ku) / "1,310 ألف دينار" (ar) / "1,310K IQD" (en)
 */
function formatIQDCompact(amount: number, locale: string): string {
  if (amount < 1_000_000) return formatAmount(amount, 'IQD');

  const thousands = Math.round(amount / 1000);
  const fmt = IQD_FORMATTERS[locale] ?? IQD_FORMATTERS['en'];
  const formatted = fmt.format(thousands);

  const suffixes: Record<string, string> = {
    ku: `${formatted} هەزار دینار`,
    ar: `${formatted} ألف دينار`,
    en: `${formatted}K IQD`,
    zh: `${formatted}千第纳尔`,
  };
  return suffixes[locale] ?? suffixes['en'];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CurrencyDisplay({
  amount,
  currency,
  locale = 'en',
  showConverted = false,
  className,
  convertedClassName,
}: CurrencyDisplayProps) {
  const { convert, isLoading } = useExchangeRates();

  const primary = formatAmount(amount, currency);
  const targetCurrency = LOCALE_CURRENCY[locale] ?? 'USD';

  // Don't show conversion if same currency, or rates are loading, or showConverted=false
  const shouldConvert =
    showConverted && !isLoading && currency !== targetCurrency;

  let convertedText: string | null = null;

  if (shouldConvert) {
    const converted = convert(
      amount,
      currency as keyof ExchangeRates['rates'],
      targetCurrency,
    );

    if (converted !== null) {
      convertedText =
        targetCurrency === 'IQD'
          ? formatIQDCompact(converted, locale)
          : formatAmount(converted, targetCurrency);
    }
  }

  return (
    <span className={cn('inline-flex items-baseline gap-1.5 flex-wrap', className)}>
      <span className="font-semibold tabular-nums">{primary}</span>
      {convertedText && (
        <span
          className={cn(
            'text-sm text-muted-foreground font-normal tabular-nums',
            convertedClassName,
          )}
        >
          ({convertedText})
        </span>
      )}
    </span>
  );
}
