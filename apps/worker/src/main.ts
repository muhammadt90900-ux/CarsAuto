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

async function bootstrap() {
  validateWorkerEnv();

  const structuredLogger = new StructuredLogger();
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: structuredLogger,
    bufferLogs: false,
  });

  const logger = new Logger('WorkerBootstrap');
  logger.log('CarsAuto worker started — consuming "translations" and "notifications" queues');

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
