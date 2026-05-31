// apps/api/src/common/logger/logger.service.ts
// Structured JSON logger — replaces NestJS default console logger in production.
// Log lines are newline-delimited JSON, parseable by Datadog / CloudWatch / Loki.

import { LoggerService, LogLevel } from '@nestjs/common';

type LogEntry = {
  level: string;
  timestamp: string;
  context?: string;
  message: string;
  trace?: string;
  [key: string]: unknown;
};

const LEVEL_ORDER: Record<string, number> = {
  verbose: 0,
  debug:   1,
  log:     2,
  warn:    3,
  error:   4,
};

export class StructuredLogger implements LoggerService {
  private readonly minLevel: number;
  private readonly isProd: boolean;

  constructor() {
    this.isProd   = process.env.NODE_ENV === 'production';
    const envLevel = process.env.LOG_LEVEL ?? (this.isProd ? 'log' : 'debug');
    this.minLevel  = LEVEL_ORDER[envLevel] ?? LEVEL_ORDER['log'];
  }

  private shouldLog(level: string): boolean {
    return (LEVEL_ORDER[level] ?? 0) >= this.minLevel;
  }

  private write(level: string, message: unknown, context?: string, trace?: string) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message:   typeof message === 'string' ? message : JSON.stringify(message),
    };

    if (context) entry.context = context;
    if (trace)   entry.trace   = trace;

    // In development, pretty-print for readability
    if (!this.isProd) {
      const prefix = `[${level.toUpperCase()}] ${context ? `[${context}] ` : ''}`;
      const out = `${entry.timestamp} ${prefix}${entry.message}`;
      level === 'error' || level === 'warn'
        ? process.stderr.write(out + (trace ? `\n${trace}` : '') + '\n')
        : process.stdout.write(out + '\n');
      return;
    }

    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  log(message: unknown, context?: string)                     { this.write('log',     message, context); }
  debug(message: unknown, context?: string)                   { this.write('debug',   message, context); }
  verbose(message: unknown, context?: string)                 { this.write('verbose', message, context); }
  warn(message: unknown, context?: string)                    { this.write('warn',    message, context); }
  error(message: unknown, trace?: string, context?: string)   { this.write('error',   message, context, trace); }

  // ── Request logger middleware ──────────────────────────────────────────────
  static requestMiddleware() {
    const logger = new StructuredLogger();
    const isProd = process.env.NODE_ENV === 'production';
    const SKIP_PATHS = new Set(['/health', '/favicon.ico']);

    return (req: any, res: any, next: () => void) => {
      const start = Date.now();
      res.on('finish', () => {
        if (SKIP_PATHS.has(req.path)) return;
        const ms      = Date.now() - start;
        const level   = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'log';
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;

        if (isProd) {
          const entry = {
            level,
            timestamp: new Date().toISOString(),
            context:   'HTTP',
            message,
            method:    req.method,
            url:       req.originalUrl,
            status:    res.statusCode,
            ms,
            ip:        req.ip,
            ua:        req.get('user-agent'),
          };
          process.stdout.write(JSON.stringify(entry) + '\n');
        } else {
          logger.write(level, message, 'HTTP');
        }
      });
      next();
    };
  }
}
