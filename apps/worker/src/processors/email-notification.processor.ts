import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../common/email/email.service';

interface DeliverPayload {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EMAIL_TYPES = new Set([
  'offer_received',
  'offer_accepted',
  'offer_declined',
  'saved_search_alert',
  'favorite_alert',
]);

@Processor('notifications')
export class EmailNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailNotificationProcessor.name);

  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
    private emailService: EmailService,   // injected — no inline transporter
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
    if (prefs.emailEnabled && EMAIL_TYPES.has(type)) {
      await this.emailService.sendMail({
        to:      user.email,
        subject: title,
        html: `
          <div style="font-family: Arial; direction: rtl; padding: 24px;">
            <h2 style="color: #2563eb;">CarsAuto</h2>
            <p>مەرحەبا ${user.name}،</p>
            <h3>${title}</h3>
            <p>${body}</p>
          </div>
        `,
        text: `${title}\n\n${body}`,
      });
      // EmailService handles retries + non-fatal failure internally
    }

    // ----- Web Push -----
    if (prefs.pushEnabled) {
      await this.notificationsService.sendWebPush(userId, { title, body, data });
    }
  }
}
