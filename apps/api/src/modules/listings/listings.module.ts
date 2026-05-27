// apps/api/src/modules/listings/listings.module.ts
import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
