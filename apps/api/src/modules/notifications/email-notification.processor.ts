import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';

interface DeliverPayload {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Processor('notifications')
export class EmailNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailNotificationProcessor.name);

  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {
    super();
  }

  async process(job: Job<DeliverPayload>) {
    const { userId, type, title, body, data } = job.data;

    const [user, prefs] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      this.notificationsService.getPreferences(userId),
    ]);

    if (!user) throw new UnrecoverableError(`User ${userId} not found`);

    // ----- Email -----
    if (prefs.emailEnabled && this.shouldEmailForType(type)) {
      try {
        await this.mailer.sendMail({
          to: user.email,
          subject: title,
          template: 'notification', // Handlebars / EJS template
          context: { name: user.name, title, body, data, type },
        });
        this.logger.log(`Email sent to ${user.email} for notification type=${type}`);
      } catch (err) {
        this.logger.error('Email delivery failed', err);
        // Let BullMQ retry
        throw err;
      }
    }

    // ----- Web Push -----
    if (prefs.pushEnabled) {
      await this.notificationsService.sendWebPush(userId, { title, body, data });
    }
  }

  /** Email only for high-signal events to avoid inbox fatigue */
  private shouldEmailForType(type: string): boolean {
    const EMAIL_TYPES = new Set([
      'offer_received',
      'offer_accepted',
      'offer_declined',
      'saved_search_alert',
      'favorite_alert',
    ]);
    return EMAIL_TYPES.has(type);
  }
}
