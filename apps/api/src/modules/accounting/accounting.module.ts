// apps/api/src/modules/accounting/accounting.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [AccountingService, EmailVerifiedGuard],
  exports: [AccountingService],
})
export class AccountingModule {}
