import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { EmailNotificationProcessor } from './email-notification.processor';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailService } from '../../common/email/email.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, EmailNotificationProcessor, EmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
