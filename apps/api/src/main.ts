// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const cfg = app.get(ConfigService);
  const isProduction = cfg.get<string>('NODE_ENV') === 'production';
  const frontendUrl = cfg.getOrThrow<string>('FRONTEND_URL');
  const port = cfg.get<number>('PORT', 4000);

  // ── Security headers (Helmet) ─────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false, // Disable CSP in development for easier debugging
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        frontendUrl,
        ...(isProduction ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24 h preflight cache
  });

  // ── Cookie parser (required for refresh-token cookies) ───────────────────
  const cookieSecret = cfg.getOrThrow<string>('COOKIE_SECRET');
  app.use(cookieParser(cookieSecret));

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── Global ValidationPipe ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: true, // throw on unknown properties
      transform: true,          // auto-transform payloads to DTO types
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,  // collect all validation errors
    }),
  );

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Failed to start', err);
  process.exit(1);
});
