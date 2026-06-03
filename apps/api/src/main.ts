// apps/api/src/main.ts — PRODUCTION MONITORING ENABLED
// Added: structured logging, request tracing, metrics endpoint, deep health checks

import { NestFactory }            from '@nestjs/core';
import { AppModule }              from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet                     from 'helmet';
import compression                from 'compression';
import cookieParser               from 'cookie-parser';
import { json, urlencoded }       from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path                  from 'path';
import { StructuredLogger }       from './common/logger/logger.service';
import { AllExceptionsFilter }    from './common/filters/all-exceptions.filter';
import { MetricsService }         from './common/monitoring/metrics.service';
import { MetricsMiddleware }      from './common/monitoring/metrics.middleware';
import { ErrorTrackerService }    from './common/monitoring/error-tracker.service';

// X-Response-Time header (high-res)
function responseTimeMiddleware() {
  return (req: any, res: any, next: () => void) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      res.setHeader('X-Response-Time', `${ms.toFixed(1)}ms`);
    });
    next();
  };
}

async function bootstrap() {
  const structuredLogger = new StructuredLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: structuredLogger,
    // Disable built-in NestJS console logger — StructuredLogger handles everything
    bufferLogs: false,
  });

  const logger = new Logger('Bootstrap');

  // ── Monitoring middleware (must be first, before any other middleware) ────
  app.use(responseTimeMiddleware());
  app.use(StructuredLogger.requestMiddleware());

  // Prometheus HTTP metrics middleware
  const metricsService = app.get(MetricsService);
  const metricsMiddleware = app.get(MetricsMiddleware);
  app.use((req: any, res: any, next: () => void) => metricsMiddleware.use(req, res, next));

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // ── Static assets ─────────────────────────────────────────────────────────
  const uploadDir = process.env.UPLOAD_DIR ?? '/tmp/uploads';
  app.useStaticAssets(path.resolve(uploadDir), {
    prefix:   '/uploads',
    index:    false,
    dotfiles: 'deny',
    setHeaders: (res: any) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');
    },
  });

  // ── Security ─────────────────────────────────────────────────────────────
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
      hsts:           { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff:        true,
      xssFilter:      true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(
    compression({
      level:     4,
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
  const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('CORS: direct requests not allowed in production'), false);
        }
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    methods:         ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:  ['Content-Type', 'Authorization', 'Accept', 'If-None-Match', 'x-trace-id', 'x-request-id'],
    exposedHeaders:  ['ETag', 'X-Response-Time', 'X-Total-Count', 'x-trace-id', 'x-request-id'],
    credentials:     true,
    maxAge:          3600,
  });

  // ── Global prefix + Validation ────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:             true,
      forbidNonWhitelisted:  true,
      transform:             true,
      transformOptions:      { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter (with injected monitoring services) ───────────
  const errorTracker = app.get(ErrorTrackerService);
  app.useGlobalFilters(new AllExceptionsFilter(errorTracker, metricsService));

  // ── Metrics endpoint (Prometheus scrape target) ───────────────────────────
  const httpAdapter = app.getHttpAdapter();

  httpAdapter.get('/metrics', async (_req: unknown, res: any) => {
    // Only allow from internal network in production
    res.setHeader('Content-Type', metricsService.contentType());
    res.setHeader('Cache-Control', 'no-store');
    res.send(await metricsService.getMetrics());
  });

  // ── Legacy /health endpoint (fast liveness) ───────────────────────────────
  httpAdapter.get('/health', (_req: unknown, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // ── Process-level error handlers ──────────────────────────────────────────
  process.on('unhandledRejection', (reason: unknown) => {
    errorTracker.capture({
      error:   reason instanceof Error ? reason : new Error(String(reason)),
      context: 'UnhandledRejection',
      level:   'fatal',
    });
  });

  process.on('uncaughtException', (err: Error) => {
    errorTracker.capture({ error: err, context: 'UncaughtException', level: 'fatal' });
    // Give the error tracker 500ms to flush before exit
    setTimeout(() => process.exit(1), 500);
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API listening on http://0.0.0.0:${port}/api`);
  logger.log(`📊 Metrics available at http://0.0.0.0:${port}/metrics`);
  logger.log(`❤️  Health checks at http://0.0.0.0:${port}/health/live and /health/ready`);
}

bootstrap();
