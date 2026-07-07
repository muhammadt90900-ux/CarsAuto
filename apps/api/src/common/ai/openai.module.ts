/**
 * apps/api/src/common/ai/openai.module.ts
 *
 * Global module — import once in AppModule, then inject OpenAiService anywhere.
 */

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiService } from './openai.service';
import { AiCacheService } from './ai-cache.service';
import { AiCostTrackerService } from './ai-cost-tracker.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [OpenAiService, AiCacheService, AiCostTrackerService],
  exports: [OpenAiService, AiCacheService, AiCostTrackerService],
})
export class OpenAiModule {}
