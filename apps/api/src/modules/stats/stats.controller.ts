// apps/api/src/modules/stats/stats.controller.ts
import { Controller, Get } from '@nestjs/common';
import { StatsService, PublicStats, CategoryStats, BrandStats } from './stats.service';

/**
 * Public, unauthenticated aggregate marketplace stats — powers the trust
 * signals in the site footer (previously hardcoded fake numbers), and the
 * homepage's category/brand tile counts (previously hardcoded "4,200+"
 * style strings with no data source). No PII, just counts, so no auth
 * guard is needed; responses are cached server-side (see StatsService)
 * since these are hit on every page load.
 */
@Controller('public/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getPublicStats(): Promise<PublicStats> {
    return this.statsService.getPublicStats();
  }

  @Get('categories')
  getCategoryStats(): Promise<CategoryStats> {
    return this.statsService.getCategoryStats();
  }

  @Get('brands')
  getBrandStats(): Promise<BrandStats> {
    return this.statsService.getBrandStats();
  }
}
