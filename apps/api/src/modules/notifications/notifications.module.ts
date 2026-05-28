import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailNotificationProcessor } from './email-notification.processor';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    /** Async email / push delivery queue — decouples heavy work from the request cycle */
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailNotificationProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
