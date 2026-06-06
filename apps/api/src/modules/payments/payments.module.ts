// apps/api/src/modules/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { PaymentRetryTask } from './tasks/payment-retry.task';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    EmailVerifiedGuard,
    StripeWebhookGuard,
    PaymentRetryTask,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
