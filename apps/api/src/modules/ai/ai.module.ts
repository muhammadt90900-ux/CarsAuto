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
import { AiChatService } from './chat/ai-chat.service';
import { AiChatController } from './chat/ai-chat.controller';
import { SearchModule } from '../search/search.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'translations' }),
    // Prompt 3 (AI Chat): SearchModule for SearchService.parseNaturalLanguageQuery
    // + search() reuse; AuthModule for JwtService (soft/optional auth — see
    // AiChatController.extractOptionalUserId()'s header comment for why this
    // isn't JwtAuthGuard).
    SearchModule,
    AuthModule,
  ],
  controllers: [AiController, AiChatController],
  providers: [AiService, TranslationService, TranslationProcessor, AiChatService],
  exports: [AiService, TranslationService],
})
export class AiModule {}
