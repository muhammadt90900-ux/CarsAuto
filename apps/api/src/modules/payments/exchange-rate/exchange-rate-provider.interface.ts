// apps/api/src/modules/payments/exchange-rate/exchange-rate-provider.interface.ts
//
// F1.4: pluggable FX rate source. ExchangeRateService (the thing the rest of
// the app talks to) depends only on this interface, never on a concrete
// provider — swapping the mock for a real FX API later is a one-line change
// in exchange-rate.module.ts, nothing else in the codebase needs to know.

export interface IExchangeRateProvider {
  /**
   * Returns how many USD one unit of `currency` is worth, e.g. for
   * currency='IQD' a plausible return is ~0.00076 (1 IQD ≈ $0.00076).
   * Throws if the currency is unsupported by this provider.
   */
  getRateToUsd(currency: string): Promise<number>;
}

export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER');
