// apps/api/src/modules/payments/exchange-rate/exchange-rate.service.ts
//
// Cache-backed lookup in front of whichever IExchangeRateProvider is bound
// (see exchange-rate.module.ts). This is the only class the rest of the
// payments module should talk to for FX rates — never inject a provider
// directly.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../common/cache/cache.service';
import { EXCHANGE_RATE_PROVIDER, IExchangeRateProvider } from './exchange-rate-provider.interface';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — FX rates don't need to be second-fresh for this use case
const CACHE_KEY_PREFIX = 'fx:rate-to-usd:';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @Inject(EXCHANGE_RATE_PROVIDER) private readonly provider: IExchangeRateProvider,
    private readonly cache: CacheService,
  ) {}

  /**
   * Returns how many USD one unit of `currency` is worth. Cached for
   * CACHE_TTL_MS so a burst of payments in the same currency doesn't hit the
   * (eventually real, rate-limited) FX provider once per payment.
   *
   * Returns null on failure instead of throwing — a missing FX rate should
   * never block a payment from being recorded; callers persist null in that
   * case and the row can be backfilled later (e.g. by a reconciliation job,
   * mirroring the pattern used for dealer counters in F1.2).
   */
  async getRateToUsd(currency: string): Promise<number | null> {
    const normalized = currency.toUpperCase();
    if (normalized === 'USD') return 1; // trivial case, skip cache/provider entirely

    try {
      return await this.cache.getOrSet(
        `${CACHE_KEY_PREFIX}${normalized}`,
        () => this.provider.getRateToUsd(normalized),
        CACHE_TTL_MS,
      );
    } catch (err) {
      this.logger.error(
        `Failed to fetch FX rate for ${normalized} → USD: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
