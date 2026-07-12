/**
 * apps/api/src/modules/suspicious-activity/suspicious-activity.module.ts
 * Trust & Safety Prompt 5.
 *
 * Exports SuspiciousActivityService so DuplicateDetectionModule can import
 * this module and call notifyAdminsIfSevere() from its three existing
 * tiers (Prompt 3) — see duplicate-detection.service.ts's Prompt 5 comments.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';
import { SuspiciousActivityService } from './suspicious-activity.service';
import { SuspiciousActivityListener } from './suspicious-activity.listener';
import { AdminSuspiciousActivityController } from './admin-suspicious-activity.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, AiModule],
  controllers: [AdminSuspiciousActivityController],
  providers: [SuspiciousActivityService, SuspiciousActivityListener],
  exports: [SuspiciousActivityService],
})
export class SuspiciousActivityModule {}
