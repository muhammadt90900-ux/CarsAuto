// apps/api/src/modules/beta/beta.module.ts
import { Module } from '@nestjs/common';
import { BetaController } from './beta.controller';
import { BetaService } from './beta.service';
// PrismaModule is @Global(), so PrismaService is available without an
// explicit import here — matching the pattern used across this codebase.

@Module({
  controllers: [BetaController],
  providers: [BetaService],
})
export class BetaModule {}
