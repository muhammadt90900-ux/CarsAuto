// apps/api/src/common/currency/currency.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateController } from './exchange-rate.controller';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [ConfigModule, AppCacheModule],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService],
  exports: [ExchangeRateService],
})
export class CurrencyModule {}
