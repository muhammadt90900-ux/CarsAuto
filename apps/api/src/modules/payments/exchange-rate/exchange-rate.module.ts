// apps/api/src/modules/payments/exchange-rate/exchange-rate.module.ts
//
// The ONLY place that binds EXCHANGE_RATE_PROVIDER to a concrete
// implementation. Defaults to the real, free ExchangeRate-API open endpoint
// (see real-exchange-rate.provider.ts). Set FX_PROVIDER=mock in the
// environment to fall back to hardcoded rates — useful for local dev/CI
// without network access, or if the free endpoint is ever down.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExchangeRateService } from './exchange-rate.service';
import { MockExchangeRateProvider } from './mock-exchange-rate.provider';
import { RealExchangeRateProvider } from './real-exchange-rate.provider';
import { EXCHANGE_RATE_PROVIDER } from './exchange-rate-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    ExchangeRateService,
    MockExchangeRateProvider,
    RealExchangeRateProvider,
    {
      provide: EXCHANGE_RATE_PROVIDER,
      useFactory: (config: ConfigService, mock: MockExchangeRateProvider, real: RealExchangeRateProvider) =>
        config.get<string>('FX_PROVIDER') === 'mock' ? mock : real,
      inject: [ConfigService, MockExchangeRateProvider, RealExchangeRateProvider],
    },
  ],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
