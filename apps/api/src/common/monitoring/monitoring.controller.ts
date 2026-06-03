// apps/api/src/common/monitoring/monitoring.controller.ts
// Receives client-side errors and Web Vitals from the Next.js frontend.

import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
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

@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new StructuredLogger();

  @Post('client-error')
  @HttpCode(HttpStatus.ACCEPTED)
  clientError(@Body() dto: ClientErrorDto, @Req() req: Request) {
    // Sanitize — never log full URL which may contain tokens
    const safeUrl = dto.url?.replace(/[?#].*$/, '') ?? 'unknown';

    this.logger.error(
      `[client] ${dto.message}`,
      dto.stack,
      'ClientError',
      {
        component:  dto.component,
        url:        safeUrl,
        traceId:    dto.traceId,
        ip:         req.ip,
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
