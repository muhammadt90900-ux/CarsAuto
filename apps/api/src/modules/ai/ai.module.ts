/**
 * apps/api/src/modules/ai/ai.module.ts
 *
 * FEATURE 2: Updated to include TranslationService + TranslationProcessor.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TranslationService } from './translation/translation.service';
import { TranslationProcessor } from './translation/translation.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'translations' }),
  ],
  controllers: [AiController],
  providers: [AiService, TranslationService, TranslationProcessor],
  exports: [AiService, TranslationService],
})
export class AiModule {}
