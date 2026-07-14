// apps/api/src/modules/newsletter/newsletter.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert rather than create: subscribing again with the same email is
   * treated as a success (idempotent), not an error — including reviving
   * a previously-unsubscribed address, since someone re-submitting the
   * form clearly wants back in. Avoids a confusing "you're already
   * subscribed" error for what should just feel like it worked.
   */
  async subscribe(dto: SubscribeNewsletterDto): Promise<{ subscribed: true }> {
    await this.prisma.newsletterSubscriber.upsert({
      where: { email: dto.email },
      create: { email: dto.email, locale: dto.locale },
      update: { locale: dto.locale, unsubscribedAt: null },
    });
    return { subscribed: true };
  }
}
