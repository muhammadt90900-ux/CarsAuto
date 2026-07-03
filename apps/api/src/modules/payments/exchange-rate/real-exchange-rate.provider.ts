// apps/api/src/modules/payments/exchange-rate/real-exchange-rate.provider.ts
//
// Live FX rates from ExchangeRate-API's free "Open Access" endpoint:
//   https://www.exchangerate-api.com/docs/free
// No API key required. Rates are updated once every 24h and cover 160+
// currencies (including IQD, AED, CNY). This is the free tier's only
// limitation — if minute-level updates or historical rates are ever needed,
// that requires their paid plan (or an alternative provider) instead.
//
// ATTRIBUTION REQUIREMENT: the provider's terms require visible attribution
// somewhere in the product when using this free endpoint (a link to
// https://www.exchangerate-api.com is enough — e.g. in a footer or an
// "about pricing" page). That's a frontend change outside this file's
// scope — don't forget to add it.
//
// Rate-limit note: they ask that you cache responses; requesting at most
// once/hour avoids any risk of throttling. ExchangeRateService already
// caches every lookup for 1 hour (see exchange-rate.service.ts), which is
// well within that guidance given the underlying data only changes daily.

import { Injectable, Logger } from '@nestjs/common';
import { IExchangeRateProvider } from './exchange-rate-provider.interface';

const OPEN_ER_API_URL = 'https://open.er-api.com/v6/latest/USD';
const FETCH_TIMEOUT_MS = 5_000;

interface OpenErApiResponse {
  result: 'success' | 'error';
  'error-type'?: string;
  rates?: Record<string, number>;
}

@Injectable()
export class RealExchangeRateProvider implements IExchangeRateProvider {
  private readonly logger = new Logger(RealExchangeRateProvider.name);

  async getRateToUsd(currency: string): Promise<number> {
    const normalized = currency.toUpperCase();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let data: OpenErApiResponse;
    try {
      const res = await fetch(OPEN_ER_API_URL, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`ExchangeRate-API HTTP ${res.status}`);
      }
      data = (await res.json()) as OpenErApiResponse;
    } finally {
      clearTimeout(timeout);
    }

    if (data.result !== 'success' || !data.rates) {
      throw new Error(`ExchangeRate-API returned an error: ${data['error-type'] ?? 'unknown'}`);
    }

    // The API returns rates base=USD, i.e. rates[X] = how many units of X
    // one USD buys. We want the inverse: how many USD one unit of X is worth.
    const usdToTarget = data.rates[normalized];
    if (!usdToTarget || usdToTarget <= 0) {
      throw new Error(`ExchangeRate-API: no rate available for currency "${normalized}"`);
    }

    const rateToUsd = 1 / usdToTarget;
    this.logger.debug(`[FX] ${normalized} → USD rate: ${rateToUsd}`);
    return rateToUsd;
  }
}
