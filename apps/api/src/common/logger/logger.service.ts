// apps/api/src/common/logger/logger.service.ts
// Production-grade structured logger with request tracing, correlation IDs, and sampling.

import { LoggerService, LogLevel } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type LogMeta = Record<string, unknown>;

type LogEntry = {
  level: string;
  timestamp: string;
  context?: string;
  message: string;
  trace?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
  durationMs?: number;
  [key: string]: unknown;
};

const LEVEL_ORDER: Record<string, number> = {
  verbose: 0,
  debug:   1,
  log:     2,
  warn:    3,
  error:   4,
};

// ── Async-local storage for per-request trace context ─────────────────────────
import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
  traceId: string;
  spanId:  string;
  userId?: string;
  requestId?: string;
}

export const traceStorage = new AsyncLocalStorage<TraceContext>();

export function createTraceContext(overrides?: Partial<TraceContext>): TraceContext {
  return {
    traceId:   randomUUID(),
    spanId:    randomUUID().slice(0, 16),
    requestId: randomUUID(),
    ...overrides,
  };
}

// ── URL redaction (F8 fix) ────────────────────────────────────────────────────
// Sensitive values transported via query string (e.g. email-verification tokens,
// password-reset tokens) are written verbatim into access logs without redaction,
// giving anyone with log access a live, exploitable token.
// Solution: strip known sensitive param names before logging.

const REDACT_PARAMS = new Set(['token', 'code', 'signature', 'access_token', 'reset_token', 'verify_token']);

function redactUrl(url: string): string {
  try {
    const u = new URL(url, 'http://x');
    let redacted = false;
    REDACT_PARAMS.forEach(p => {
      if (u.searchParams.has(p)) {
        u.searchParams.set(p, '[REDACTED]');
        redacted = true;
      }
    });
    if (!redacted) return url;
    return u.pathname + (u.search ? `?${u.searchParams.toString()}` : '');
  } catch {
    return url;
  }
}

// ── Main logger ────────────────────────────────────────────────────────────────

export class StructuredLogger implements LoggerService {
  private readonly minLevel: number;
  private readonly isProd: boolean;
  // Dev color map
  private static readonly COLORS: Record<string, string> = {
    verbose: '\x1b[90m', debug: '\x1b[36m', log: '\x1b[32m',
    warn: '\x1b[33m', error: '\x1b[31m',
  };
  private static readonly RESET = '\x1b[0m';

  constructor() {
    this.isProd   = process.env.NODE_ENV === 'production';
    const envLevel = process.env.LOG_LEVEL ?? (this.isProd ? 'log' : 'debug');
    this.minLevel  = LEVEL_ORDER[envLevel] ?? LEVEL_ORDER['log'] ?? 0;
  }

  private shouldLog(level: string): boolean {
    return (LEVEL_ORDER[level] ?? 0) >= this.minLevel;
  }

  private buildEntry(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
    meta?: LogMeta,
  ): LogEntry {
    const traceCtx = traceStorage.getStore();
    const entry: LogEntry = {
      level,
      timestamp:  new Date().toISOString(),
      service:    'autobazaar-api',
      version:    process.env.APP_VERSION ?? '1.0.0',
      env:        process.env.NODE_ENV ?? 'development',
      message:    typeof message === 'string' ? message : JSON.stringify(message),
    };
    if (context)            entry.context   = context;
    if (trace)              entry.trace     = trace;
    if (traceCtx?.traceId)  entry.traceId   = traceCtx.traceId;
    if (traceCtx?.spanId)   entry.spanId    = traceCtx.spanId;
    if (traceCtx?.userId)   entry.userId    = traceCtx.userId;
    if (traceCtx?.requestId) entry.requestId = traceCtx.requestId;
    if (meta) Object.assign(entry, meta);
    return entry;
  }

  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
    meta?: LogMeta,
  ) {
    if (!this.shouldLog(level)) return;

    const entry = this.buildEntry(level, message, context, trace, meta);

    if (!this.isProd) {
      const color  = StructuredLogger.COLORS[level] ?? '';
      const reset  = StructuredLogger.RESET;
      const tid    = entry.traceId ? ` [${(entry.traceId as string).slice(0, 8)}]` : '';
      const prefix = `${color}[${level.toUpperCase()}]${reset}${tid} ${context ? `[${context}] ` : ''}`;
      const out    = `${entry.timestamp} ${prefix}${entry.message}`;
      const dest   = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
      dest.write(out + (trace ? `\n${trace}` : '') + '\n');
      return;
    }

    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  // NestJS LoggerService interface
  log(message: unknown, context?: string, meta?: LogMeta)   { this.write('log',     message, context, undefined, meta); }
  debug(message: unknown, context?: string, meta?: LogMeta) { this.write('debug',   message, context, undefined, meta); }
  verbose(message: unknown, context?: string)               { this.write('verbose', message, context); }
  warn(message: unknown, context?: string, meta?: LogMeta)  { this.write('warn',    message, context, undefined, meta); }
  error(message: unknown, trace?: string, context?: string, meta?: LogMeta) {
    this.write('error', message, context, trace, meta);
  }

  // ── Request logger middleware ──────────────────────────────────────────────
  // Injects trace context into AsyncLocalStorage for the lifetime of each request.
  static requestMiddleware() {
    const logger  = new StructuredLogger();
    const isProd  = process.env.NODE_ENV === 'production';
    const SKIP    = new Set(['/health', '/metrics', '/favicon.ico']);
    // sampling: log 100% errors/warns, 10% info in high-traffic prod
    const SAMPLE_RATE = parseFloat(process.env.LOG_SAMPLE_RATE ?? '1.0');

    return (req: any, res: any, next: () => void) => {
      // Extract or generate trace context
      const traceId   = (req.headers['x-trace-id']   as string) ?? randomUUID();
      const spanId    = (req.headers['x-span-id']    as string) ?? randomUUID().slice(0, 16);
      const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();

      const ctx: TraceContext = { traceId, spanId, requestId };

      // Propagate trace headers downstream
      res.setHeader('x-trace-id',   traceId);
      res.setHeader('x-request-id', requestId);

      traceStorage.run(ctx, () => {
        const start = process.hrtime.bigint();

        res.on('finish', () => {
          if (SKIP.has(req.path)) return;
          const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
          const status     = res.statusCode;
          const level      = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';

          // Sampling: always log non-2xx; sample 2xx by SAMPLE_RATE
          if (level === 'log' && Math.random() > SAMPLE_RATE) return;

          const message = `${req.method} ${redactUrl(req.originalUrl)} ${status} ${durationMs.toFixed(1)}ms`;  // F8
          const meta: LogMeta = {
            http: {
              method:     req.method,
              url:        redactUrl(req.originalUrl),  // F8: redact sensitive query params
              statusCode: status,
              durationMs: parseFloat(durationMs.toFixed(2)),
              ip:         req.ip ?? req.socket?.remoteAddress,
              userAgent:  req.get('user-agent'),
              referer:    req.get('referer'),
              contentLength: res.get('content-length'),
            },
          };

          if (isProd) {
            const entry = logger.buildEntry(level, message, 'HTTP', undefined, meta);
            entry.traceId   = traceId;
            entry.spanId    = spanId;
            entry.requestId = requestId;
            process.stdout.write(JSON.stringify(entry) + '\n');
          } else {
            logger.write(level, message, 'HTTP', undefined, meta);
          }
        });

        next();
      });
    };
  }
}
