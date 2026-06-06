// apps/api/src/common/monitoring/monitoring.controller.ts
// Receives client-side errors and Web Vitals from the Next.js frontend.

import { Controller, Post, Body, Req, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { Request } from 'express';
import { StructuredLogger } from '../logger/logger.service';

interface ClientErrorDto {
  message:    string;
  stack?:     string;
  component?: string;
  url:        string;
  userAgent:  string;
  timestamp:  string;
  traceId?:   string;
}

interface WebVitalDto {
  name:      string;
  value:     number;
  rating:    'good' | 'needs-improvement' | 'poor';
  id:        string;
  url:       string;
  timestamp: string;
}

// In-memory rate limiter for client-error endpoint (no Redis dependency)
// Limit: 20 error reports per IP per minute
const clientErrorRateMap = new Map<string, { count: number; resetAt: number }>();
const CLIENT_ERROR_LIMIT   = 20;
const CLIENT_ERROR_WINDOW  = 60_000;

function checkClientErrorRate(ip: string): void {
  const now   = Date.now();
  const entry = clientErrorRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    clientErrorRateMap.set(ip, { count: 1, resetAt: now + CLIENT_ERROR_WINDOW });
    return;
  }
  if (entry.count >= CLIENT_ERROR_LIMIT) {
    throw new HttpException('Client error report rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
  }
  entry.count++;
}

// Prune stale entries every 5 minutes to prevent unbounded map growth
setInterval(() => {
  const now = Date.now();
  clientErrorRateMap.forEach((v, k) => {
    if (now > v.resetAt) clientErrorRateMap.delete(k);
  });
}, 5 * 60_000);

@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new StructuredLogger();

  @Post('client-error')
  @HttpCode(HttpStatus.ACCEPTED)
  clientError(@Body() dto: ClientErrorDto, @Req() req: Request) {
    // Rate-limit by IP to prevent log-flooding DoS
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]!.trim() ??
      req.socket?.remoteAddress ??
      'unknown';
    checkClientErrorRate(ip);

    // Sanitize — never log full URL which may contain tokens
    const safeUrl = dto.url?.replace(/[?#].*$/, '') ?? 'unknown';
    // Truncate stack trace to prevent log injection / oversized entries
    const safeStack = dto.stack ? dto.stack.slice(0, 2000) : undefined;
    const safeMessage = (dto.message ?? '').slice(0, 500);

    this.logger.error(
      `[client] ${safeMessage}`,
      safeStack,
      'ClientError',
      {
        component:  dto.component?.slice(0, 100),
        url:        safeUrl,
        traceId:    dto.traceId,
        ip,
        timestamp:  dto.timestamp,
      } as any,
    );
    return { received: true };
  }

  @Post('vitals')
  @HttpCode(HttpStatus.ACCEPTED)
  webVitals(@Body() dto: WebVitalDto) {
    // Only log poor vitals to avoid noise
    if (dto.rating === 'poor') {
      this.logger.warn(
        `[web-vital] ${dto.name}=${dto.value} (${dto.rating})`,
        'WebVitals',
        { name: dto.name, value: dto.value, rating: dto.rating, url: dto.url?.replace(/[?#].*$/, '') } as any,
      );
    }
    return { received: true };
  }
}
