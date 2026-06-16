// apps/api/src/modules/dealers/dealers.module.ts — FEATURE 9: imports NotificationsModule

import { Module } from '@nestjs/common';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DealersController],
  providers: [DealersService, EmailVerifiedGuard],
  exports: [DealersService],
})
export class DealersModule {}
