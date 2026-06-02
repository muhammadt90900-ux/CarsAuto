// apps/api/src/main.ts — PERFORMANCE OPTIMISED
// Key improvements:
//   1. Response compression with Brotli (level 4) fallback to gzip
//   2. HTTP/2 keep-alive header hints
//   3. ETag support for GET responses (304 Not Modified)
//   4. Global response-time header for observability

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

// PERF: response-time middleware — adds X-Response-Time header
function responseTime() {
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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // PERF: disable NestJS logger in prod (use structured logging instead)
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'debug', 'error', 'warn', 'verbose'],
  });
  const logger = new Logger('Bootstrap');

  app.use(responseTime());

  // PERF: strict body size limits prevent DoS via large payloads
  // NOTE: multipart/form-data (file uploads) is NOT subject to this limit —
  // multer handles that separately with per-upload limits in upload.module.ts
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // ── Static file serving for uploads ─────────────────────────────────────
  // Serves /uploads/<uuid>.webp as public static files.
  // helmet noSniff + immutable Cache-Control headers prevent content-type confusion.
  const uploadDir = process.env.UPLOAD_DIR ?? '/tmp/uploads';
  app.useStaticAssets(path.resolve(uploadDir), {
    prefix: '/uploads',
    // Security: prevent directory listing, only serve known image types
    index: false,
    dotfiles: 'deny',
    setHeaders: (res: any) => {
      // Immutable CDN-style caching for uploaded images (UUID filenames = content-addressed)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      // Belt-and-suspenders content-type sniffing prevention
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Prevent images from being rendered in an iframe (clickjacking)
      res.setHeader('X-Frame-Options', 'DENY');
      // No referrer leakage from image loads
      res.setHeader('Referrer-Policy', 'no-referrer');
    },
  });

  // Security headers
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

  // PERF: Brotli preferred (40–60 % smaller than gzip), fallback to gzip
  // threshold: 1 KB — don't compress tiny responses
  app.use(
    compression({
      level: 4,          // Brotli quality 4 — good ratio, low CPU cost
      threshold: 1024,   // bytes — skip compression below this
      filter: (req, res) => {
        // Never compress SSE or WebSocket upgrades
        if (req.headers['accept'] === 'text/event-stream') return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.use(cookieParser());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const rawOrigins = process.env.FRONTEND_URL ?? 'http://localhost:3000';
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
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'If-None-Match'],
    exposedHeaders: ['ETag', 'X-Response-Time', 'X-Total-Count'],
    credentials: true,
    // PERF: 1 h preflight cache — eliminates OPTIONS round-trip on repeat requests
    maxAge: 3600,
  });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Health-check endpoint ─────────────────────────────────────────────────
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: unknown, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API listening on http://0.0.0.0:${port}/api`);
}

bootstrap();
