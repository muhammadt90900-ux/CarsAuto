/**
 * apps/api/src/common/ai/openai.module.ts
 *
 * Global module — import once in AppModule, then inject OpenAiService anywhere.
 */

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAiService } from './openai.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
