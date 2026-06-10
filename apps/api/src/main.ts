// apps/api/src/main.ts
// ✅ FIX: Added explicit type annotation to NestFactory.create<INestApplication>
// instead of NestExpressApplication to fix NestJS v10/v11 mixed version
// TypeScript errors where app.use(), app.get(), app.set() etc. were not found.

import { NestFactory }         from '@nestjs/core';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { AppModule }           from './app.module';
import helmet                  from 'helmet';
import compression             from 'compression';
import cookieParser            from 'cookie-parser';
import { json, urlencoded, raw } from 'express';
import * as path               from 'path';
import { StructuredLogger }    from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MetricsService }      from './common/monitoring/metrics.service';
import { MetricsMiddleware }   from './common/monitoring/metrics.middleware';
import { ErrorTrackerService } from './common/monitoring/error-tracker.service';
import { validateEnv }         from './config/env.validation';

const UPLOAD_CACHE_HEADERS = {
  'Cache-Control':         'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':       'DENY',
  'Referrer-Policy':       'no-referrer',
} as const;

function responseTimeMiddleware() {
  return (req: any, res: any, next: () => void) => {
    const startNs = process.hrtime.bigint();
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function (statusCode: number, ...args: any[]) {
      try {
        const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
        res.setHeader('X-Response-Time', `${elapsedMs.toFixed(1)}ms`);
      } catch {}
      return originalWriteHead(statusCode, ...args);
    };
    next();
  };
}

async function bootstrap() {
  validateEnv();

  const structuredLogger = new StructuredLogger();

  // ✅ FIX: Use INestApplication instead of NestExpressApplication
  // This resolves the TypeScript errors about missing .use(), .get(),
  // .setGlobalPrefix(), .useGlobalPipes() etc. caused by NestJS v10/v11 mismatch.
  const app = await NestFactory.create<INestApplication>(AppModule, {
    logger: structuredLogger,
    bufferLogs: false,
  });

  // Cast to any for express-specific methods (useStaticAssets, set)
  const expressApp = app as any;
  expressApp.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  const logger = new Logger('Bootstrap');

  // ── Monitoring ────────────────────────────────────────────────────────────
  app.use(responseTimeMiddleware());
  app.use(StructuredLogger.requestMiddleware());

  const metricsService   = app.get(MetricsService);
  const metricsMiddleware = app.get(MetricsMiddleware);
  app.use((req: any, res: any, next: () => void) =>
    metricsMiddleware.use(req, res, next),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use('/api/payments/webhook', raw({ type: 'application/json' }));
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // ── Static assets ─────────────────────────────────────────────────────────
  const uploadDir = process.env.UPLOAD_DIR ?? '/tmp/uploads';
  expressApp.useStaticAssets(path.resolve(uploadDir), {
    prefix:   '/uploads',
    index:    false,
    dotfiles: 'deny',
    setHeaders: (res: any) => {
      Object.entries(UPLOAD_CACHE_HEADERS).forEach(([k, v]) =>
        res.setHeader(k, v),
      );
    },
  });

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          imgSrc:     ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc:    ["'self'"],
          objectSrc:  ["'none'"],
          mediaSrc:   ["'self'"],
          frameSrc:   ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(
    compression({
      level: 4,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['accept'] === 'text/event-stream') return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.use(cookieParser());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const rawOrigins   = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('CORS: direct requests not allowed in production'), false);
        }
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin) || origin.includes('app.github.dev')) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    methods:        ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'If-None-Match', 'x-trace-id', 'x-request-id', 'X-Requested-With'],
    exposedHeaders: ['ETag', 'X-Response-Time', 'X-Total-Count', 'x-trace-id', 'x-request-id'],
    credentials:    true,
    maxAge:         3600,
  });

  // ── Global prefix + Validation ────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:              true,
      forbidNonWhitelisted:   true,
      transform:              true,
      transformOptions:       { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter ───────────────────────────────────────────────
  const errorTracker = app.get(ErrorTrackerService);
  app.useGlobalFilters(new AllExceptionsFilter(errorTracker, metricsService));

  // ── Metrics endpoint ──────────────────────────────────────────────────────
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/metrics', async (req: any, res: any) => {
    if (process.env.NODE_ENV === 'production') {
      const ip: string = req.ip ?? '';
      const isInternal = /^(127\.|::1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
      if (!isInternal) { res.status(403).json({ statusCode: 403, message: 'Forbidden' }); return; }
    }
    try {
      res.setHeader('Content-Type', metricsService.contentType());
      res.setHeader('Cache-Control', 'no-store');
      res.send(await metricsService.getMetrics());
    } catch {
      res.status(500).json({ statusCode: 500, message: 'Metrics unavailable' });
    }
  });

  // ── Health ────────────────────────────────────────────────────────────────
  httpAdapter.get('/health', (_req: unknown, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // ── Process error handlers ────────────────────────────────────────────────
  process.on('unhandledRejection', (reason: unknown) => {
    errorTracker.capture({
      error:   reason instanceof Error ? reason : new Error(String(reason)),
      context: 'UnhandledRejection',
      level:   'fatal',
    });
  });

  process.on('uncaughtException', (err: Error) => {
    errorTracker.capture({ error: err, context: 'UncaughtException', level: 'fatal' });
    setTimeout(() => process.exit(1), 500);
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API listening on http://0.0.0.0:${port}/api`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received — shutting down gracefully`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
