// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded, raw } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { StructuredLogger } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MetricsService } from './common/monitoring/metrics.service';
import { MetricsMiddleware } from './common/monitoring/metrics.middleware';
import { ErrorTrackerService } from './common/monitoring/error-tracker.service';
import { validateEnv } from './config/env.validation';

const UPLOAD_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
} as const;

const INTERNAL_IP_PATTERNS = ['127.0.0.1', '::1'] as const;

/** Returns true for RFC 1918 / loopback addresses (Docker + private networks). */
function isInternalIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  return (
    INTERNAL_IP_PATTERNS.includes(ip as any) ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/** Adds X-Response-Time header using Node.js high-resolution timer. */
function responseTimeMiddleware() {
  return (req: any, res: any, next: () => void) => {
    const startNs = process.hrtime.bigint();
    res.on('finish', () => {
      try {
        const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
        res.setHeader('X-Response-Time', `${elapsedMs.toFixed(1)}ms`);
      } catch (err) {
        // Silently ignore header-setting errors
      }
    });
    next();
  };
}

async function bootstrap() {
  validateEnv();

  const structuredLogger = new StructuredLogger();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: structuredLogger,
    bufferLogs: false,
  });

  const logger = new Logger('Bootstrap');

  // ── Monitoring (must be first — measures all downstream middleware) ────────
  app.use(responseTimeMiddleware());
  app.use(StructuredLogger.requestMiddleware());

  const metricsService = app.get(MetricsService);
  const metricsMiddleware = app.get(MetricsMiddleware);
  app.use((req: any, res: any, next: () => void) =>
    metricsMiddleware.use(req, res, next),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────
  // Raw body for Stripe webhook must be registered BEFORE json() middleware.
  app.use('/api/payments/webhook', raw({ type: 'application/json' }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // ── Static assets ────────────────────────────────────────────────────────
  const uploadDir = process.env.UPLOAD_DIR ?? '/tmp/uploads';
  app.useStaticAssets(path.resolve(uploadDir), {
    prefix: '/uploads',
    index: false,
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
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(
    compression({
      level: 4,
      threshold: 1024,
      filter: (req, res) => {
        // Do not compress SSE streams
        if (req.headers['accept'] === 'text/event-stream') return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.use(cookieParser());

  // ── CORS ───────────────────────────────────────────────────────────────────
  const rawOrigins = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow requests without Origin header (server-to-server, curl) in dev only
        if (process.env.NODE_ENV === 'production') {
          return callback(
            new Error('CORS: direct requests not allowed in production'),
            false,
          );
        }
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'If-None-Match',
      'x-trace-id',
      'x-request-id',
      'X-Requested-With',
    ],
    exposedHeaders: [
      'ETag',
      'X-Response-Time',
      'X-Total-Count',
      'x-trace-id',
      'x-request-id',
    ],
    credentials: true,
    maxAge: 3600,
  });

  // ── Global prefix + Validation ────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global exception filter ───────────────────────────────────────────────
  const errorTracker = app.get(ErrorTrackerService);
  app.useGlobalFilters(new AllExceptionsFilter(errorTracker, metricsService));

  // ── Metrics endpoint (internal network only in production) ────────────────
  const httpAdapter = app.getHttpAdapter();

  httpAdapter.get('/metrics', async (req: any, res: any) => {
    if (process.env.NODE_ENV === 'production') {
      const ip: string =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket?.remoteAddress ??
        '';
      if (!isInternalIp(ip)) {
        res.status(403).json({ statusCode: 403, message: 'Forbidden' });
        return;
      }
    }
    try {
      res.setHeader('Content-Type', metricsService.contentType());
      res.setHeader('Cache-Control', 'no-store');
      res.send(await metricsService.getMetrics());
    } catch (err) {
      res.status(500).json({ statusCode: 500, message: 'Metrics unavailable' });
    }
  });

  // ── Liveness endpoint ─────────────────────────────────────────────────────
  httpAdapter.get('/health', (_req: unknown, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ── Process-level error handlers ──────────────────────────────────────────
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
    // Allow error tracker to flush before exiting
    setTimeout(() => process.exit(1), 500);
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API listening on http://0.0.0.0:${port}/api`);
  logger.log(`📊 Metrics available at http://0.0.0.0:${port}/metrics`);
  logger.log(
    `❤️  Health checks at http://0.0.0.0:${port}/health/live and /health/ready`,
  );
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
