/**
 * apps/api/src/common/tasks/tasks.module.ts
 *
 * ADDED (Trust & Safety Prompt 3). Before this, TokenCleanupTask and
 * EmbeddingSyncTask were declared directly in AppModule's own `providers`
 * array with no wrapping module — fine as long as nothing outside
 * AppModule needed them, but DuplicateDetectionService (this prompt) needs
 * to call EmbeddingSyncTask.embedListing() directly (see that service's
 * header comment for why), and a provider declared only in AppModule isn't
 * injectable into another feature module's providers.
 *
 * IMPORTANT: EmbeddingSyncTask must be declared as a provider in EXACTLY
 * ONE place in the whole app, here. Its @Cron(EVERY_5_MINUTES) decorator
 * registers against ScheduleModule once per instance Nest creates — if it
 * were also left in AppModule's providers (or re-declared in another
 * module instead of just imported), the cron job would double-fire. This
 * module is the single source; everything else imports TasksModule and
 * injects EmbeddingSyncTask via normal DI, sharing the one instance.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenCleanupTask } from './token-cleanup.task';
import { EmbeddingSyncTask } from './embedding-sync.task';

@Module({
  imports: [PrismaModule],
  providers: [TokenCleanupTask, EmbeddingSyncTask],
  exports: [EmbeddingSyncTask],
})
export class TasksModule {}
