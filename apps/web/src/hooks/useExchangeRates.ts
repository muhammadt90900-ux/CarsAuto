// apps/web/src/hooks/useExchangeRates.ts
//
// TanStack Query hook that fetches live exchange rates from the API.
// Cached for 1 hour, automatically refetches in the background.
// Falls back to static rates if the API is unavailable.

'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExchangeRates {
  base: 'USD';
  rates: {
    IQD: number;
    AED: number;
    CNY: number;
    EUR: number;
    GBP: number;
    USD: number;
  };
  updatedAt: string;
  source: 'live' | 'fallback';
}

// ─── Fallback rates ───────────────────────────────────────────────────────────
// Used when the API call fails entirely (network down, server error).

export const STATIC_FALLBACK_RATES: ExchangeRates = {
  base: 'USD',
  rates: {
    USD: 1,
    IQD: 1310,
    AED: 3.674,
    CNY: 7.24,
    EUR: 0.92,
    GBP: 0.79,
  },
  updatedAt: new Date(0).toISOString(),
  source: 'fallback',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to get live exchange rates.
 *
 * @example
 * const { rates, isLoading, convert } = useExchangeRates();
 * const iqd = convert(100, 'USD', 'IQD'); // → 131000
 */
export function useExchangeRates() {
  const { data, isLoading, isError } = useQuery<ExchangeRates>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await api.get<ExchangeRates>('/exchange-rates');
      return response.data;
    },
    staleTime: 60 * 60 * 1000,          // 1 hour — don't refetch more often
    refetchInterval: 60 * 60 * 1000,    // background refetch every hour
    refetchIntervalInBackground: false,  // don't wake up tabs in background
    retry: 2,
    // On error: return fallback so app always has rates
    placeholderData: STATIC_FALLBACK_RATES,
  });

  const rates = data ?? STATIC_FALLBACK_RATES;

  /**
   * Convert an amount between currencies.
   * Returns null if conversion is not possible.
   */
  function convert(
    amount: number,
    from: keyof ExchangeRates['rates'],
    to: keyof ExchangeRates['rates'],
  ): number | null {
    if (from === to) return amount;

    const fromRate = rates.rates[from];
    const toRate = rates.rates[to];

    if (!fromRate || !toRate) return null;

    const inUsd = amount / fromRate;
    return Math.round(inUsd * toRate);
  }

  /**
   * Get the direct rate between two currencies.
   * Example: getRate('USD', 'IQD') → 1310
   */
  function getRate(
    from: keyof ExchangeRates['rates'],
    to: keyof ExchangeRates['rates'],
  ): number {
    if (from === to) return 1;
    const fromRate = rates.rates[from];
    const toRate = rates.rates[to];
    if (!fromRate || !toRate) return 1;
    return toRate / fromRate;
  }

  return {
    rates,
    isLoading,
    isError,
    isLive: rates.source === 'live',
    updatedAt: rates.updatedAt,
    convert,
    getRate,
  };
}
