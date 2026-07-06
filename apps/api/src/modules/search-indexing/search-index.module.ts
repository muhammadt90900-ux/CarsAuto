// apps/api/src/modules/search-indexing/search-index.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SearchIndexListener } from './search-index.listener';
import { SEARCH_INDEX_QUEUE } from './search-index.constants';

// Registered once, here, as its own variable so the exact same dynamic
// module instance can be re-exported below — re-exporting `BullModule`
// (the static class) would NOT re-export this specific queue registration;
// NestJS re-export needs the same DynamicModule reference that was imported.
const searchIndexQueue = BullModule.registerQueue({ name: SEARCH_INDEX_QUEUE });

@Module({
  imports: [searchIndexQueue],
  providers: [SearchIndexListener],
  // Re-exported so other modules (admin.module.ts, for the full-reindex
  // endpoint) can @InjectQueue(SEARCH_INDEX_QUEUE) the same queue without
  // a second registerQueue() call for the same name.
  exports: [searchIndexQueue],
})
export class SearchIndexingModule {}
