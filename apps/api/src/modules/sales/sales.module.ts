// apps/api/src/modules/sales/sales.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [SalesController],
  providers: [SalesService, EmailVerifiedGuard],
  exports: [SalesService],
})
export class SalesModule {}
