// apps/api/src/modules/dealers/dealers.module.ts

import { Module } from '@nestjs/common';
import { DealersController } from './dealers.controller';
import { DealersService } from './dealers.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';

@Module({
  imports: [PrismaModule],
  controllers: [DealersController],
  providers: [DealersService, EmailVerifiedGuard],
  exports: [DealersService],
})
export class DealersModule {}
