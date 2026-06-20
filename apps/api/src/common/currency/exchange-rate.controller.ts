// apps/api/src/common/currency/exchange-rate.controller.ts
//
// Public endpoint for live exchange rates.
// Sets Cache-Control header so CDN/browsers cache for 1 hour.

import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExchangeRateService, ExchangeRates } from './exchange-rate.service';
import { Public } from '../decorators/public.decorator';

@Controller('exchange-rates')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * GET /api/v1/exchange-rates
   *
   * Returns current USD-based exchange rates for all supported currencies.
   * Response is publicly cacheable for 1 hour (3600 seconds).
   *
   * @example Response:
   * {
   *   "base": "USD",
   *   "rates": { "IQD": 1310, "AED": 3.674, "CNY": 7.24, "EUR": 0.92, "GBP": 0.79, "USD": 1 },
   *   "updatedAt": "2025-01-15T12:00:00.000Z",
   *   "source": "live"
   * }
   */
  @Public()
  @Get()
  async getRates(@Res() res: Response): Promise<void> {
    const rates: ExchangeRates = await this.exchangeRateService.getAllRates();

    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    res.setHeader('X-Rates-Source', rates.source);
    res.json(rates);
  }
}
