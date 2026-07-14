// apps/api/src/modules/stats/stats.module.ts
import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
// PrismaModule and AppCacheModule are both @Global(), so PrismaService and
// CacheService are available for injection without importing them here —
// matching the pattern used by other feature modules in this codebase.

@Module({
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
