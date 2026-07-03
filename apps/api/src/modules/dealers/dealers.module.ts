// apps/api/src/modules/dealers/dealers.module.ts — FEATURE 9: imports NotificationsModule

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { DealerListeners } from './dealer.listeners';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { DealerReconciliationService } from './tasks/dealer-reconciliation.service';
import { DealerReconciliationProcessor, DEALER_RECONCILIATION_QUEUE } from './tasks/dealer-reconciliation.processor';
import { DealerReconciliationScheduler } from './tasks/dealer-reconciliation.scheduler';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    BullModule.registerQueue({ name: DEALER_RECONCILIATION_QUEUE }),
  ],
  controllers: [DealersController],
  providers: [
    DealersService,
    EmailVerifiedGuard,
    DealerListeners,
    DealerReconciliationService,
    DealerReconciliationProcessor,
    DealerReconciliationScheduler,
  ],
  exports: [DealersService, DealerReconciliationService],
})
export class DealersModule {}
