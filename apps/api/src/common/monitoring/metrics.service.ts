// apps/api/src/common/monitoring/metrics.service.ts
// Prometheus metrics using prom-client. Exposes /api/metrics endpoint.

import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  Summary,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // ── HTTP metrics ──────────────────────────────────────────────────────────
  readonly httpRequestsTotal = new Counter({
    name:       'http_requests_total',
    help:       'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers:  [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name:       'http_request_duration_seconds',
    help:       'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers:  [this.registry],
  });

  readonly httpRequestSize = new Summary({
    name:       'http_request_size_bytes',
    help:       'Size of HTTP requests in bytes',
    labelNames: ['method', 'route'],
    percentiles: [0.5, 0.9, 0.99],
    registers:  [this.registry],
  });

  // ── Business metrics ──────────────────────────────────────────────────────
  readonly activeUsers = new Gauge({
    name:      'autobazaar_active_users_total',
    help:      'Number of active authenticated users',
    registers: [this.registry],
  });

  readonly listingsCreated = new Counter({
    name:       'autobazaar_listings_created_total',
    help:       'Total listings created',
    labelNames: ['type', 'plan'],
    registers:  [this.registry],
  });

  readonly authAttempts = new Counter({
    name:       'autobazaar_auth_attempts_total',
    help:       'Authentication attempts',
    labelNames: ['action', 'result'],  // action: login|register|refresh; result: success|failure
    registers:  [this.registry],
  });

  readonly paymentEvents = new Counter({
    name:       'autobazaar_payment_events_total',
    help:       'Payment events',
    labelNames: ['event', 'plan', 'currency'],
    registers:  [this.registry],
  });

  readonly searchQueries = new Counter({
    name:       'autobazaar_search_queries_total',
    help:       'Search queries executed',
    labelNames: ['has_filters', 'result_count_bucket'],
    registers:  [this.registry],
  });

  // ── Database metrics ──────────────────────────────────────────────────────
  readonly dbQueryDuration = new Histogram({
    name:       'autobazaar_db_query_duration_ms',
    help:       'Database query duration in ms',
    labelNames: ['model', 'operation'],
    buckets:    [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
    registers:  [this.registry],
  });

  readonly dbSlowQueries = new Counter({
    name:      'autobazaar_db_slow_queries_total',
    help:      'Queries exceeding slow query threshold',
    registers: [this.registry],
  });

  // ── Cache metrics ─────────────────────────────────────────────────────────
  readonly cacheHits = new Counter({
    name:       'autobazaar_cache_hits_total',
    help:       'Cache hits',
    labelNames: ['store'],
    registers:  [this.registry],
  });

  readonly cacheMisses = new Counter({
    name:       'autobazaar_cache_misses_total',
    help:       'Cache misses',
    labelNames: ['store'],
    registers:  [this.registry],
  });

  // ── Error metrics ─────────────────────────────────────────────────────────
  readonly errorsTotal = new Counter({
    name:       'autobazaar_errors_total',
    help:       'Total application errors',
    labelNames: ['type', 'code', 'context'],
    registers:  [this.registry],
  });

  onModuleInit() {
    collectDefaultMetrics({
      register: this.registry,
      prefix:   'autobazaar_node_',
      labels:   {
        service: 'autobazaar-api',
        version: process.env.APP_VERSION ?? '1.0.0',
        env:     process.env.NODE_ENV ?? 'production',
      },
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }

  // Helper: normalize route to avoid high-cardinality labels
  static normalizeRoute(url: string): string {
    return url
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\?.*$/, '')
      .substring(0, 100);
  }
}
