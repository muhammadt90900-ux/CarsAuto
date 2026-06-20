// apps/api/src/common/permissions/permissions.module.ts

import { Module } from '@nestjs/common';
import { ListingPermissionService } from './listing-permission.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:   [PrismaModule],
  providers: [ListingPermissionService],
  exports:   [ListingPermissionService],
})
export class PermissionsModule {}
