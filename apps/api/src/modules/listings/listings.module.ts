// apps/api/src/modules/listings/listings.module.ts
import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ViewFlushTask } from './tasks/view-flush.task';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AppCacheModule } from '../../common/cache/cache.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { PermissionsModule } from '../../common/permissions/permissions.module';
import { AiModule } from '../ai/ai.module';
import { SearchModule } from '../search/search.module';

// F-ARCH fix: DealersModule import (via forwardRef — a circular-dependency
// workaround) removed. ListingsService no longer injects DealersService at
// all; it emits domain events instead (see common/events/,
// modules/dealers/dealer.listeners.ts). EventEmitter2 is globally available
// via EventEmitterModule.forRoot({ global: true }) in app.module.ts, so no
// extra import is needed here for that either.
//
// Search Architecture Phase 3: SearchModule imported for its exported
// MeilisearchSearchStrategy, used only by ListingsService.getFacets() (GET
// /listings/facets) — no circular dependency (SearchModule doesn't import
// ListingsModule).

@Module({
  imports: [
    PrismaModule,
    AppCacheModule,
    PermissionsModule,
    AiModule,
    SearchModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService, EmailVerifiedGuard, ViewFlushTask],
  exports: [ListingsService],
})
export class ListingsModule {}
