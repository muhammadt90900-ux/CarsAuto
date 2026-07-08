/**
 * apps/api/src/modules/fraud/fraud.module.ts
 *
 * Prompt 4 — exports FraudScoringService so the worker's nightly recompute
 * job's LOGIC can be mirrored (the worker is a separate compiled app, so
 * per apps/worker/README.md's duplication convention, FraudScoringService
 * itself is copied there too — see apps/worker/src/processors/
 * fraud-recompute.processor.ts's header comment).
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FraudScoringService } from './fraud-scoring.service';
import { FraudController } from './fraud.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FraudController],
  providers: [FraudScoringService],
  exports: [FraudScoringService],
})
export class FraudModule {}
