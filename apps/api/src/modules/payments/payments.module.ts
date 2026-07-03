// apps/api/src/modules/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { PaymentRetryTask } from './tasks/payment-retry.task';
// Iraqi regional gateways
import { ZainCashGateway } from './gateways/zaincash.gateway';
import { FastPayGateway } from './gateways/fastpay.gateway';
import { QiCardGateway } from './gateways/qicard.gateway';
import { AsiaHawalaGateway } from './gateways/asiahawala.gateway';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';

@Module({
  imports: [PrismaModule, ConfigModule, ExchangeRateModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    EmailVerifiedGuard,
    StripeWebhookGuard,
    PaymentRetryTask,
    // Iraqi gateways
    ZainCashGateway,
    FastPayGateway,
    QiCardGateway,
    AsiaHawalaGateway,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
