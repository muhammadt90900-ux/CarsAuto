// apps/worker/src/worker.module.ts
//
// F-HIGH fix: standalone BullMQ worker process. Heavy background jobs
// (AI translation, transactional/notification email + push) used to run
// as @Processor classes registered inside the HTTP API's Nest app
// (apps/api), competing with HTTP request handlers for the same CPU/event
// loop. This module is the root of a SEPARATE Node process (apps/worker)
// that does nothing but consume BullMQ jobs — no HTTP server, no
// controllers, no Express middleware.
//
// Connects to the SAME Redis (REDIS_URL) and SAME Postgres (DATABASE_URL)
// as the API. Processes the SAME queue names ("translations",
// "notifications") the API already produces jobs to — so no API-side
// changes were needed for this migration.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaService } from './common/prisma/prisma.service';
import { OpenAiService } from './common/ai/openai.service';
import { EmailService } from './common/email/email.service';
import { NotificationsService } from './modules/notifications/notifications.service';
import { TranslationProcessor } from './processors/translation.processor';
import { EmailNotificationProcessor } from './processors/email-notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: { url: cfg.get<string>('REDIS_URL', 'redis://localhost:6379') },
      }),
    }),

    // Same queue names as apps/api/src/modules/ai/ai.module.ts and
    // apps/api/src/modules/notifications/notifications.module.ts — this is
    // what lets the worker pick up jobs the API enqueues, with zero API changes.
    BullModule.registerQueue({ name: 'translations' }),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  providers: [
    PrismaService,
    OpenAiService,
    EmailService,
    NotificationsService,
    TranslationProcessor,
    EmailNotificationProcessor,
  ],
})
export class WorkerModule {}
