// apps/api/src/modules/search/search.controller.ts
import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { SearchService } from './search.service';
import { SearchProtectionService } from '../../common/throttler/search-protection.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchProtection: SearchProtectionService,
  ) {}

  /**
   * GET /search
   *
   * Query params (all optional, compose together):
   *   q            – free-text keyword (searches all localised title/desc fields)
   *   type         – listing type  : CAR | MOTORCYCLE | SPARE_PART
   *   brandId      – vehicle brand UUID
   *   modelId      – vehicle model UUID  (brand must match)
   *   trimId       – specific trim UUID  (model must match)
   *   year         – exact production year
   *   minYear      – year range lower bound
   *   maxYear      – year range upper bound
   *   condition    – NEW | USED | SALVAGE
   *   minPrice     – price lower bound  (USD)
   *   maxPrice     – price upper bound  (USD)
   *   locationId   – location UUID
   *   fuelType     – PETROL | DIESEL | HYBRID | PLUG_IN_HYBRID | ELECTRIC | LPG | CNG
   *   transmission – MANUAL | AUTOMATIC | SEMI_AUTOMATIC | CVT | DUAL_CLUTCH
   *   color        – free-text color string (case-insensitive)
   *   minMileage   – mileage lower bound (km)
   *   maxMileage   – mileage upper bound (km)
   *   page         – 1-based page number (default 1)
   *   limit        – results per page    (default 20, max 100)
   */
  @Get()
  search(
    @Query('q')            q:            string,
    @Query('type')         type:         string,
    @Query('brandId')      brandId:      string,
    @Query('modelId')      modelId:      string,
    @Query('trimId')       trimId:       string,
    @Query('year')         year:         string,
    @Query('minYear')      minYear:      string,
    @Query('maxYear')      maxYear:      string,
    @Query('condition')    condition:    string,
    @Query('minPrice')     minPrice:     string,
    @Query('maxPrice')     maxPrice:     string,
    @Query('locationId')   locationId:   string,
    @Query('fuelType')     fuelType:     string,
    @Query('transmission') transmission: string,
    @Query('color')        color:        string,
    @Query('minMileage')   minMileage:   string,
    @Query('maxMileage')   maxMileage:   string,
    @Query('page')         page:         string,
    @Query('limit')        limit:        string,
    @Req() req: Request,
  ) {
    // ── Abuse prevention ────────────────────────────────────────────────────
    const ip = this.extractIp(req);
    this.searchProtection.checkSearchRate(ip);

    // Validate & sanitise free-text query
    const safeQuery = this.searchProtection.validateQuery(q);

    // Validate pagination — prevents deep-scan attacks
    const { page: safePage, limit: safeLimit } = this.searchProtection.validatePagination(
      Number(page ?? 1),
      Number(limit ?? 20),
    );

    return this.searchService.search(safeQuery, {
      type,
      brandId,
      modelId,
      trimId,
      year,
      minYear,
      maxYear,
      condition,
      minPrice,
      maxPrice,
      locationId,
      fuelType,
      transmission,
      color,
      minMileage,
      maxMileage,
      page:  safePage,
      limit: safeLimit,
    });
  }

  /**
   * GET /search/autocomplete?q=toy
   * Returns up to 6 title suggestions for the search input dropdown.
   */
  @Get('autocomplete')
  autocomplete(@Query('q') q: string, @Req() req: Request) {
    // ── Abuse prevention ────────────────────────────────────────────────────
    const ip = this.extractIp(req);
    this.searchProtection.checkAutocompleteRate(ip);

    const safeQuery = this.searchProtection.validateQuery(q);
    return this.searchService.autocomplete(safeQuery);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (Array.isArray(forwarded) ? forwarded[0] : forwarded)
        .split(',')[0]
        .trim();
    }
    return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
  }
}
