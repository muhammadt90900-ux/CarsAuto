// apps/api/src/modules/newsletter/newsletter.module.ts
import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
// PrismaModule is @Global(), so PrismaService is available without an
// explicit import here — matching the pattern used across this codebase.

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
