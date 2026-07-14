// apps/api/src/modules/stats/stats.controller.ts
import { Controller, Get } from '@nestjs/common';
import { StatsService, PublicStats } from './stats.service';

/**
 * Public, unauthenticated aggregate marketplace stats — powers the trust
 * signals in the site footer (previously hardcoded fake numbers). No PII,
 * just counts, so no auth guard is needed; response is cached server-side
 * (see StatsService) since this is hit on every page load.
 */
@Controller('public/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getPublicStats(): Promise<PublicStats> {
    return this.statsService.getPublicStats();
  }
}
