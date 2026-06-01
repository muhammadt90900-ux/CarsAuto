// apps/api/src/modules/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, EmailVerifiedGuard],
})
export class PaymentsModule {}
