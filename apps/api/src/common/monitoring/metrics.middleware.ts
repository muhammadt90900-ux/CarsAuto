// apps/api/src/common/monitoring/metrics.middleware.ts
// Intercepts every request to record Prometheus HTTP metrics.

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start  = process.hrtime.bigint();
    const route  = MetricsService.normalizeRoute(req.path);
    const method = req.method;

    // Track request body size
    const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
    if (contentLength > 0) {
      this.metrics.httpRequestSize.observe({ method, route }, contentLength);
    }

    res.on('finish', () => {
      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
      const statusCode  = String(res.statusCode);

      this.metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode });
      this.metrics.httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSec);

      if (res.statusCode >= 400) {
        this.metrics.errorsTotal.inc({
          type:    res.statusCode >= 500 ? 'server_error' : 'client_error',
          code:    statusCode,
          context: 'http',
        });
      }
    });

    next();
  }
}
