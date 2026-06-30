import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded, raw } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { StructuredLogger } from './common/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MetricsService } from './common/monitoring/metrics.service';
import { MetricsMiddleware } from './common/monitoring/metrics.middleware';
import { ErrorTrackerService } from './common/monitoring/error-tracker.service';
import { validateEnv } from './config/env.validation';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

/** Intercepts writeHead to inject X-Response-Time before headers are flushed. */
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

// BigInt JSON serialization fix
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function bootstrap() {
  validateEnv();

  const structuredLogger = new StructuredLogger();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: structuredLogger,
    bufferLogs: false,
  });

  // Trust loopback + private network proxies so req.ip is unwrapped correctly
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  const logger = new Logger('Bootstrap');

  // ── Monitoring (must be first — measures all downstream middleware) ────────
  app.use(responseTimeMiddleware());
  app.use(StructuredLogger.requestMiddleware());

  const metricsService = app.get(MetricsService);
  const metricsMiddleware = app.get(MetricsMiddleware);
  app.use((req: any, res: any, next: () => void) =>
    metricsMiddleware.use(req, res, next),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  // Raw body for Stripe webhook must be registered BEFORE json() middleware.
  app.use('/api/payments/webhook', raw({ type: 'application/json' }));
  // F4 fix: Raw body for regional payment webhooks (FastPay, QiCard, AsiaHawala, ZainCash)
  // HMAC/signature verification requires the original bytes, not re-serialised JSON.
  app.use('/api/payments/zaincash/webhook',   raw({ type: 'application/json' }));
  app.use('/api/payments/fastpay/webhook',    raw({ type: 'application/json' }));
  app.use('/api/payments/qicard/webhook',     raw({ type: 'application/json' }));
  app.use('/api/payments/asiahawala/webhook', raw({ type: 'application/json' }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // F-HIGH fix: removed `app.useStaticAssets(...)` for /tmp/uploads. Uploaded
  // images now go straight to Cloudinary (see upload.service.ts) and are
  // served from Cloudinary's CDN via the returned secure_url — there is no
  // longer a local /uploads directory for this server to serve.

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
      // xssFilter removed — deprecated in helmet v7, CSP covers this
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

  // ── CORS ──────────────────────────────────────────────────────────────────
  const rawOrigins = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  // Allow Codespaces preview domains automatically
  const codespaceOriginPattern = /^https:\/\/[a-z0-9-]+-3000\.app\.github\.dev$/;
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        if (process.env.NODE_ENV === 'production') {
          return callback(
            new Error('CORS: direct requests not allowed in production'),
            false,
          );
        }
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (codespaceOriginPattern.test(origin)) return callback(null, true);
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
      const ip: string = req.ip ?? '';
      const isInternal = /^(127\.|::1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
      if (!isInternal) {
        res.status(403).json({ statusCode: 403, message: 'Forbidden' });
        return;
      }
    }
    try {
      res.setHeader('Content-Type', metricsService.contentType());
      res.setHeader('Cache-Control', 'no-store');
      res.send(await metricsService.getMetrics());
    } catch {
      res.status(500).json({ statusCode: 500, message: 'Metrics unavailable' });
    }
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
    setTimeout(() => process.exit(1), 500);
  });

  // ── Socket.io Redis adapter ──────────────────────────────────────────────
  // Must be attached before app.listen() so the chat gateway's underlying
  // Socket.io server is created with the Redis adapter already in place —
  // otherwise WS events would only reach clients on the same replica.
  const redisIoAdapter = new RedisIoAdapter(app);
  try {
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  } catch (err) {
    errorTracker.capture({
      error: err instanceof Error ? err : new Error(String(err)),
      context: 'RedisIoAdapter.connectToRedis',
      level: 'fatal',
    });
    logger.error(
      `Failed to connect Socket.io Redis adapter: ${err instanceof Error ? err.message : err}`,
    );
    throw err; // fail fast — a chat server that can't fan out events across replicas should not start
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 API listening on http://0.0.0.0:${port}/api`);
  logger.log(`📊 Metrics available at http://0.0.0.0:${port}/metrics`);
  logger.log(`❤️  Health checks at http://0.0.0.0:${port}/health/live and /health/ready`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.log(`${signal} received — shutting down gracefully`);
    await redisIoAdapter.dispose();
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
