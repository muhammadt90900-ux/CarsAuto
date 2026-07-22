// apps/api/src/modules/referrals/referrals.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralsController } from './referrals.controller';
import { AdminReferralsController } from './admin-referrals.controller';
import { ReferralsService } from './referrals.service';
import { ReferralListeners } from './referral.listeners';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ReferralsController, AdminReferralsController],
  providers: [ReferralsService, ReferralListeners, EmailVerifiedGuard],
  exports: [ReferralsService],
})
export class ReferralsModule {}
