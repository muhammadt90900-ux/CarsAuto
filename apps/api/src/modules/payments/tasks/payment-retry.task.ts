// apps/api/src/modules/payments/tasks/payment-retry.task.ts
//
// Scheduled sweeper that picks up payments due for retry.
// Runs every 5 minutes. The PaymentsService handles the actual Stripe call
// and exponential back-off scheduling.
//
// Requires @nestjs/schedule — already installed via ScheduleModule in app.module.ts.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from '../payments.service';

@Injectable()
export class PaymentRetryTask {
  private readonly logger = new Logger(PaymentRetryTask.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Every 5 minutes: find failed payments whose nextRetryAt is overdue
   * and attempt to confirm them via Stripe.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepFailedPayments() {
    try {
      const result = await this.paymentsService.retryFailedPayments();
      if (result.processed > 0) {
        this.logger.log(`Payment retry sweep: ${result.processed} payment(s) processed`);
      }
    } catch (err: any) {
      this.logger.error(`Payment retry sweep failed: ${err.message}`, err.stack);
    }
  }
}
