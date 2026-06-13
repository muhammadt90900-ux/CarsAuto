// apps/api/src/modules/listings/listings.module.ts
import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { PermissionsModule } from '../../common/permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ListingsController],
  providers: [ListingsService, EmailVerifiedGuard],
  exports: [ListingsService],
})
export class ListingsModule {}
