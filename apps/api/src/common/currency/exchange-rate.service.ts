// apps/api/src/common/currency/exchange-rate.service.ts
//
// Fetches live currency exchange rates from ExchangeRate-API (free tier).
// Redis-backed cache with 1-hour TTL to stay within 1500 req/month limit.
// Graceful fallback to hardcoded rates if API is unavailable.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExchangeRates {
  /** Base currency for all rates */
  base: 'USD';
  rates: {
    IQD: number;
    AED: number;
    CNY: number;
    EUR: number;
    GBP: number;
    USD: number;
  };
  /** ISO timestamp of when rates were last fetched */
  updatedAt: string;
  /** Whether these are live rates or hardcoded fallback */
  source: 'live' | 'fallback';
}

export type SupportedCurrency = 'USD' | 'IQD' | 'AED' | 'CNY' | 'EUR' | 'GBP';

// ─── Fallback rates (as of 2025 — update periodically) ───────────────────────

const FALLBACK_RATES: ExchangeRates['rates'] = {
  USD: 1,
  IQD: 1310,
  AED: 3.674,
  CNY: 7.24,
  EUR: 0.92,
  GBP: 0.79,
};

const CACHE_KEY = 'exchange_rates:USD';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly apiKey: string | undefined;
  private readonly apiBase = 'https://v6.exchangerate-api.com/v6';

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.apiKey = this.config.get<string>('EXCHANGE_RATE_API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        'EXCHANGE_RATE_API_KEY not set — will use hardcoded fallback rates',
      );
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Returns all supported exchange rates (USD-based).
   * Served from Redis cache when available; fetches live otherwise.
   */
  async getAllRates(): Promise<ExchangeRates> {
    return this.cache.getOrSet<ExchangeRates>(
      CACHE_KEY,
      () => this.fetchLiveRates(),
      CACHE_TTL_MS,
    );
  }

  /**
   * Get the exchange rate from one currency to another.
   * Example: getRate('USD', 'IQD') → 1310
   */
  async getRate(from: SupportedCurrency, to: SupportedCurrency): Promise<number> {
    if (from === to) return 1;

    const { rates } = await this.getAllRates();

    const fromRate = rates[from];
    const toRate = rates[to];

    if (!fromRate || !toRate) {
      throw new Error(`Unsupported currency pair: ${from} → ${to}`);
    }

    // Convert via USD as base: from→USD→to
    return toRate / fromRate;
  }

  /**
   * Convert an amount from one currency to another.
   * Example: convertAmount(100, 'USD', 'IQD') → 131000
   */
  async convertAmount(
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency,
  ): Promise<number> {
    const rate = await this.getRate(from, to);
    return Math.round(amount * rate * 100) / 100;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async fetchLiveRates(): Promise<ExchangeRates> {
    if (!this.apiKey) {
      return this.buildFallback();
    }

    try {
      const url = `${this.apiBase}/${this.apiKey}/latest/USD`;
      const response = await axios.get<{
        result: string;
        conversion_rates: Record<string, number>;
        time_last_update_utc: string;
      }>(url, { timeout: 8000 });

      if (response.data.result !== 'success') {
        throw new Error(`API returned non-success result: ${response.data.result}`);
      }

      const r = response.data.conversion_rates;
      const rates: ExchangeRates['rates'] = {
        USD: 1,
        IQD: r['IQD'] ?? FALLBACK_RATES.IQD,
        AED: r['AED'] ?? FALLBACK_RATES.AED,
        CNY: r['CNY'] ?? FALLBACK_RATES.CNY,
        EUR: r['EUR'] ?? FALLBACK_RATES.EUR,
        GBP: r['GBP'] ?? FALLBACK_RATES.GBP,
      };

      this.logger.log(
        `Live rates fetched: 1 USD = ${rates.IQD} IQD / ${rates.AED} AED / ${rates.CNY} CNY`,
      );

      return {
        base: 'USD',
        rates,
        updatedAt: new Date().toISOString(),
        source: 'live',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to fetch live exchange rates: ${msg} — using fallback`);
      return this.buildFallback();
    }
  }

  private buildFallback(): ExchangeRates {
    return {
      base: 'USD',
      rates: { ...FALLBACK_RATES },
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    };
  }
}
