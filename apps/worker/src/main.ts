// apps/worker/src/main.ts
//
// F-HIGH fix: this process runs ONLY BullMQ job processors — there is no
// `app.listen()` anywhere here. `NestFactory.createApplicationContext()`
// boots the Nest DI container (so @Processor classes get instantiated and
// start consuming jobs) without ever opening an HTTP port. The process
// stays alive because the underlying BullMQ Worker instances each hold an
// open Redis connection / event loop reference — there's no need for a
// manual keep-alive loop.

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { StructuredLogger } from './common/logger/logger.service';
import { validateWorkerEnv } from './config/env.validation';
import { initSentry } from './common/monitoring/sentry.init';
import { ErrorTrackerService } from './common/monitoring/error-tracker.service';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  // PROMPT 3: first thing, same reasoning as apps/api/src/main.ts — captures
  // bootstrap-time failures too, and is safe to call unconditionally even
  // with SENTRY_DSN unset (produces a no-op client).
  initSentry();

  validateWorkerEnv();

  const structuredLogger = new StructuredLogger();
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: structuredLogger,
    bufferLogs: false,
  });

  const logger = new Logger('WorkerBootstrap');
  logger.log('CarsAuto worker started — consuming "translations" and "notifications" queues');

  // ── Process-level error handlers ────────────────────────────────────────
  // PROMPT 3: this process previously had none of these — an unhandled
  // rejection in a processor's async code (outside BullMQ's own job-failure
  // handling, e.g. a bug in a setTimeout callback) would only ever show up
  // as a raw stack trace in container logs, with no Sentry visibility.
  const errorTracker = app.get(ErrorTrackerService);
  process.on('unhandledRejection', (reason: unknown) => {
    errorTracker.capture({
      error: reason instanceof Error ? reason : new Error(String(reason)),
      context: 'UnhandledRejection',
      level: 'fatal',
    });
  });
  process.on('uncaughtException', (err: Error) => {
    errorTracker.capture({
      error: err,
      context: 'UncaughtException',
      level: 'fatal',
    });
    setTimeout(() => process.exit(1), 500);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  // BullMQ's WorkerHost.onModuleDestroy (wired in automatically by
  // @nestjs/bullmq) stops each worker from pulling NEW jobs and waits for
  // any job currently being processed to finish before resolving — that's
  // what "drains the queue before exit" means here. app.close() triggers
  // that for every registered processor.
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received — draining in-flight jobs before shutdown`);
    try {
      await app.close();
      await Sentry.close(2000);
      logger.log('Worker shut down cleanly');
      process.exit(0);
    } catch (err) {
      logger.error(`Error during worker shutdown: ${(err as Error).message}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during worker bootstrap:', err);
  process.exit(1);
});
