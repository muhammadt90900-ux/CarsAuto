// apps/api/src/common/search-index/search-index.module.ts
//
// Global module (mirrors OpenAiModule's pattern — see its header comment)
// so any feature module can inject MeilisearchService without importing
// this module itself. MeilisearchService.onModuleInit() does the
// connection + one-time-per-boot index/settings setup.

import { Global, Module } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';

@Global()
@Module({
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class SearchIndexCommonModule {}
