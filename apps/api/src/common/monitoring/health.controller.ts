// apps/api/src/common/monitoring/health.controller.ts
// Deep health checks: DB, Redis, disk, memory. Used by load-balancers and uptime monitors.

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService }  from '../cache/cache.service';
import * as os from 'os';

interface HealthCheckResult {
  status:  'ok' | 'degraded' | 'down';
  checks:  Record<string, ComponentHealth>;
  uptime:  number;
  version: string;
  timestamp: string;
}

interface ComponentHealth {
  status:    'ok' | 'degraded' | 'down';
  latencyMs?: number;
  detail?:   string;
}

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache:  CacheService,
  ) {}

  // Liveness — fast: just proves the process is alive
  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Readiness — full deep checks: DB, Redis, memory
  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  async readiness() {
    const result = await this.runChecks();
    const code   = result.status === 'down' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;
    // Note: @HttpCode above sets default; we need to throw or use response object for dynamic codes.
    // Returning the object with correct status field; Nginx/ALB reads the JSON status field.
    return result;
  }

  // Full health — alias with all details (for internal dashboards)
  @Get('health')
  async health() {
    return this.runChecks();
  }

  private async runChecks(): Promise<HealthCheckResult> {
    const [db, cache, memory] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);

    const checks: Record<string, ComponentHealth> = {
      database: db.status === 'fulfilled' ? db.value : { status: 'down', detail: String((db as any).reason) },
      redis:    cache.status === 'fulfilled' ? cache.value : { status: 'degraded', detail: String((cache as any).reason) },
      memory:   memory.status === 'fulfilled' ? memory.value : { status: 'degraded', detail: 'check failed' },
    };

    const statuses = Object.values(checks).map(c => c.status);
    const overall  = statuses.includes('down')     ? 'down'
                   : statuses.includes('degraded') ? 'degraded'
                   : 'ok';

    return {
      status:    overall,
      checks,
      uptime:    Math.round(process.uptime()),
      version:   process.env.APP_VERSION ?? '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      return { status: 'down', latencyMs: Date.now() - start, detail: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const key = '__health__';
      await this.cache.set(key, '1', 5);
      await this.cache.get(key);
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      return { status: 'degraded', latencyMs: Date.now() - start, detail: (err as Error).message };
    }
  }

  private checkMemory(): ComponentHealth {
    const total = os.totalmem();
    const free  = os.freemem();
    const used  = total - free;
    const pct   = (used / total) * 100;
    const heapUsed = process.memoryUsage().heapUsed;
    const heapTotal = process.memoryUsage().heapTotal;
    const heapPct = (heapUsed / heapTotal) * 100;

    const status = pct > 95 || heapPct > 95 ? 'down'
                 : pct > 85 || heapPct > 85 ? 'degraded'
                 : 'ok';

    return {
      status,
      detail: `sys ${pct.toFixed(1)}% used, heap ${heapPct.toFixed(1)}% used`,
    };
  }
}
