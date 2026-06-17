// apps/api/src/common/monitoring/monitoring.module.ts

import { Global, Module } from '@nestjs/common';
import { PrismaModule }          from '../prisma/prisma.module';
import { AppCacheModule }        from '../cache/cache.module';
import { MetricsService }        from './metrics.service';
import { MetricsMiddleware }     from './metrics.middleware';
import { ErrorTrackerService }   from './error-tracker.service';
import { AuditLogService }       from './audit-log.service';
import { HealthController }      from './health.controller';
import { MonitoringController }  from './monitoring.controller';

@Global()
@Module({
  imports: [PrismaModule, AppCacheModule],
  controllers: [HealthController, MonitoringController],
  providers: [
    MetricsService,
    MetricsMiddleware,
    ErrorTrackerService,
    AuditLogService,
  ],
  exports: [
    MetricsService,
    MetricsMiddleware,
    ErrorTrackerService,
    AuditLogService,
  ],
})
export class MonitoringModule {}
