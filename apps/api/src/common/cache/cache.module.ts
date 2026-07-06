// apps/api/src/common/cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CriticalStateService } from './critical-state.service';

@Global()
@Module({
  providers: [CacheService, CriticalStateService],
  exports: [CacheService, CriticalStateService],
})
export class AppCacheModule {}
