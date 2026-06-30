// apps/api/src/modules/listings/listings.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ViewFlushTask } from './tasks/view-flush.task';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AppCacheModule } from '../../common/cache/cache.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { PermissionsModule } from '../../common/permissions/permissions.module';
import { AiModule } from '../ai/ai.module';
import { DealersModule } from '../dealers/dealers.module';

@Module({
  imports: [
    PrismaModule,
    AppCacheModule,
    PermissionsModule,
    AiModule,
    forwardRef(() => DealersModule),   // FEATURE 9 — forward-ref avoids circular dep
  ],
  controllers: [ListingsController],
  providers: [ListingsService, EmailVerifiedGuard, ViewFlushTask],
  exports: [ListingsService],
})
export class ListingsModule {}
