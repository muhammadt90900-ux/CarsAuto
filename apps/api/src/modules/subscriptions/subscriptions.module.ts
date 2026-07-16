// apps/api/src/modules/subscriptions/subscriptions.module.ts

import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { PermissionsModule } from '../../common/permissions/permissions.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';

@Module({
  imports: [PrismaModule, PaymentsModule, PermissionsModule],
  controllers: [SubscriptionsController, AdminSubscriptionsController],
  providers: [SubscriptionsService, EmailVerifiedGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
