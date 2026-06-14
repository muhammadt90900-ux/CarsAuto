// apps/api/src/modules/search/search.module.ts
// FEATURE 2B: OpenAiModule is global so SearchService can inject OpenAiService directly.
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SearchProtectionService } from '../../common/throttler/search-protection.service';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService, SearchProtectionService],
})
export class SearchModule {}
