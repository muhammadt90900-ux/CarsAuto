// apps/api/src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService, EmailVerifiedGuard],
  exports: [InventoryService],
})
export class InventoryModule {}
