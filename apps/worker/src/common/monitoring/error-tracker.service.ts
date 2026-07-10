// apps/worker/src/common/monitoring/error-tracker.service.ts
//   (mirrors apps/api/src/common/monitoring/error-tracker.service.ts's
//   shape/dedup logic — kept as a separate, simpler copy rather than a
//   shared package because the worker has no MetricsService/HTTP layer to
//   plug into, same "copied and kept in sync" pattern already used for the
//   processors it shares with apps/api — see translation.processor.ts's
//   header comment)
//
// PROMPT 3: centralized error capture for the worker process. Used by
// main.ts's process-level handlers and by each processor's
// `@OnWorkerEvent('failed')` handler (see e.g. translation.processor.ts) to
// forward BullMQ job failures to Sentry with job name/id as context —
// never the full job payload, which may contain PII (email addresses,
// listing content) or, for anything payment-adjacent, financial data.

import { Injectable, Logger } from '@nestjs/common';

export interface WorkerErrorEvent {
  error:    Error | unknown;
  context?: string;
  jobName?: string;
  jobId?:   string;
  extra?:   Record<string, unknown>;
  level?:   'error' | 'warning' | 'fatal';
}

@Injectable()
export class ErrorTrackerService {
  private readonly logger = new Logger('WorkerErrorTracker');
  private readonly isProd = process.env.NODE_ENV === 'production';
  private readonly dedup = new Map<string, number>();
  private readonly DEDUP_TTL_MS = 60_000;

  capture(event: WorkerErrorEvent): void {
    const err = event.error instanceof Error ? event.error : new Error(String(event.error));

    const key = `${err.name}:${err.message.slice(0, 60)}:${event.context ?? ''}:${event.jobName ?? ''}`;
    const now = Date.now();
    const last = this.dedup.get(key);
    if (last && now - last < this.DEDUP_TTL_MS) return;
    this.dedup.set(key, now);
    if (this.dedup.size > 500) {
      for (const [k, t] of this.dedup) {
        if (now - t > this.DEDUP_TTL_MS) this.dedup.delete(k);
      }
    }

    const level = event.level ?? 'error';
    const meta = {
      errorName: err.name,
      context:   event.context,
      jobName:   event.jobName,
      jobId:     event.jobId,
      extra:     event.extra,
    };

    if (this.isProd) {
      process.stdout.write(JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        service:   'carsauto-worker',
        message:   err.message,
        stack:     err.stack,
        ...meta,
      }) + '\n');
    } else {
      this.logger.error(`[${event.context ?? 'worker'}] ${err.message}`, err.stack);
    }

    this.forwardToSentry(err, event, level, meta);
  }

  private forwardToSentry(
    err: Error,
    event: WorkerErrorEvent,
    level: string,
    meta: Record<string, unknown>,
  ): void {
    if (!process.env.SENTRY_DSN) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node');
      Sentry.withScope((scope: any) => {
        scope.setTag('service', 'worker');
        if (meta.jobName) scope.setTag('jobName', meta.jobName as string);
        if (meta.jobId)   scope.setTag('jobId', meta.jobId as string);
        if (event.extra)  scope.setExtras(event.extra);
        scope.setLevel(level as any);
        Sentry.captureException(err);
      });
    } catch {
      // Sentry not installed — silent fail
    }
  }
}
