// apps/api/src/modules/vehicles/vehicles.module.ts
import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService], // export so ListingsModule can reuse if needed
})
export class VehiclesModule {}
