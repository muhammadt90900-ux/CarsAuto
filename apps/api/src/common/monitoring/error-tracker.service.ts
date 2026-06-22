// apps/api/src/common/monitoring/error-tracker.service.ts
// Centralized error tracking: structured error capture, deduplication, and alert thresholds.
// Pluggable: drop-in Sentry integration when SENTRY_DSN is set.

import { Injectable, Logger } from '@nestjs/common';
import { traceStorage } from '../logger/logger.service';
import { MetricsService } from './metrics.service';

export interface ErrorEvent {
  error:      Error | unknown;
  context?:   string;
  userId?:    string;
  requestId?: string;
  traceId?:   string;
  extra?:     Record<string, unknown>;
  level?:     'error' | 'warning' | 'fatal';
  tags?:      Record<string, string>;
}

@Injectable()
export class ErrorTrackerService {
  private readonly logger = new Logger('ErrorTracker');
  private readonly isProd = process.env.NODE_ENV === 'production';
  // In-memory dedup window: suppress identical errors within 60s
  private readonly dedup = new Map<string, number>();
  private readonly DEDUP_TTL_MS = 60_000;

  constructor(private readonly metrics: MetricsService) {}

  capture(event: ErrorEvent): void {
    const traceCtx = traceStorage.getStore();
    const err      = event.error instanceof Error ? event.error : new Error(String(event.error));

    const key = this.dedupKey(err, event.context);
    if (this.isDuplicate(key)) return;

    const level = event.level ?? (err.name === 'FatalError' ? 'fatal' : 'error');
    const meta  = {
      errorName:  err.name,
      errorCode:  (err as any).code,
      context:    event.context,
      userId:     event.userId ?? traceCtx?.userId,
      traceId:    event.traceId ?? traceCtx?.traceId,
      requestId:  event.requestId ?? traceCtx?.requestId,
      tags:       event.tags,
      extra:      event.extra,
    };

    // Increment error metric
    this.metrics.errorsTotal.inc({
      type:    level,
      code:    (err as any).code ?? err.name,
      context: event.context ?? 'unknown',
    });

    // Log structured error
    if (this.isProd) {
      process.stdout.write(JSON.stringify({
        level,
        timestamp:  new Date().toISOString(),
        service:    'carsauto-api',
        message:    err.message,
        stack:      err.stack,
        ...meta,
      }) + '\n');
    } else {
      this.logger.error(
        `[${event.context ?? 'app'}] ${err.message}`,
        err.stack,
      );
    }

    // Forward to Sentry if configured
    this.forwardToSentry(err, event, level, meta);
  }

  captureMessage(message: string, level: ErrorEvent['level'] = 'warning', extra?: Record<string, unknown>): void {
    const traceCtx = traceStorage.getStore();
    const entry = {
      level,
      timestamp:  new Date().toISOString(),
      service:    'carsauto-api',
      message,
      traceId:    traceCtx?.traceId,
      requestId:  traceCtx?.requestId,
      ...extra,
    };

    if (this.isProd) {
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      this.logger.warn(`[message] ${message}`);
    }
  }

  // ── Sentry integration (graceful: no-op if SDK absent) ──────────────────
  private forwardToSentry(
    err: Error,
    event: ErrorEvent,
    level: string,
    meta: Record<string, unknown>,
  ): void {
    if (!process.env.SENTRY_DSN) return;
    try {
      // Dynamic import so the package is optional
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node');
      Sentry.withScope((scope: any) => {
        if (meta.userId)    scope.setUser({ id: meta.userId as string });
        if (meta.traceId)   scope.setTag('traceId', meta.traceId as string);
        if (event.tags)     Object.entries(event.tags!).forEach(([k, v]) => scope.setTag(k, v));
        if (event.extra)    scope.setExtras(event.extra);
        scope.setLevel(level as any);
        Sentry.captureException(err);
      });
    } catch {
      // Sentry not installed — silent fail
    }
  }

  private dedupKey(err: Error, context?: string): string {
    return `${err.name}:${err.message.slice(0, 60)}:${context ?? ''}`;
  }

  private isDuplicate(key: string): boolean {
    const now  = Date.now();
    const last = this.dedup.get(key);
    if (last && now - last < this.DEDUP_TTL_MS) return true;
    this.dedup.set(key, now);
    // Prune old keys periodically
    if (this.dedup.size > 500) {
      for (const [k, t] of this.dedup) {
        if (now - t > this.DEDUP_TTL_MS) this.dedup.delete(k);
      }
    }
    return false;
  }
}
