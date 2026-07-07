// apps/api/src/modules/search/search.module.ts
// FEATURE 2B: OpenAiModule is global so SearchService can inject OpenAiService directly.
// Search Architecture Phase 2: MeilisearchService (common/search-index/) is
// also global (SearchIndexCommonModule) so it needs no import here either —
// only MeilisearchSearchStrategy, which lives in THIS module, needs to be
// declared as a provider.
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SearchProtectionService } from '../../common/throttler/search-protection.service';
import { MeilisearchSearchStrategy } from './meilisearch-search.strategy';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService, SearchProtectionService, MeilisearchSearchStrategy],
  // Search Architecture Phase 3: exported so ListingsModule can inject
  // MeilisearchSearchStrategy directly for GET /listings/facets, without
  // pulling in SearchService/SearchController.
  // Prompt 3 (AI Chat): AiChatModule reuses SearchService.parseNaturalLanguageQuery
  // + search() directly rather than duplicating NL-filter-parsing logic —
  // exported alongside MeilisearchSearchStrategy for that purpose.
  exports: [MeilisearchSearchStrategy, SearchService],
})
export class SearchModule {}
