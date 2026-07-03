// apps/api/src/modules/payments/exchange-rate/mock-exchange-rate.provider.ts
//
// Hardcoded, approximate, slow-moving fallback rates (roughly accurate as of
// early 2026). Used when FX_PROVIDER=mock (see exchange-rate.module.ts) —
// intended for local dev/CI without network access, or as an emergency
// fallback if the real provider's endpoint is down. NOT accurate enough for
// real settlement/accounting numbers; the default provider is
// RealExchangeRateProvider (real-exchange-rate.provider.ts).

import { Injectable, Logger } from '@nestjs/common';
import { IExchangeRateProvider } from './exchange-rate-provider.interface';

// Rate = USD value of 1 unit of the currency.
const MOCK_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  AED: 0.2723,   // AED is USD-pegged at 3.6725, so this is exact and won't drift
  IQD: 0.00076,  // ~1310 IQD/USD, approximate — IQD is not freely floating
  CNY: 0.138,
};

@Injectable()
export class MockExchangeRateProvider implements IExchangeRateProvider {
  private readonly logger = new Logger(MockExchangeRateProvider.name);

  async getRateToUsd(currency: string): Promise<number> {
    const rate = MOCK_RATES_TO_USD[currency.toUpperCase()];
    if (rate === undefined) {
      throw new Error(`MockExchangeRateProvider: no rate configured for currency "${currency}"`);
    }
    this.logger.debug(`[MOCK FX] ${currency} → USD rate: ${rate}`);
    return rate;
  }
}
