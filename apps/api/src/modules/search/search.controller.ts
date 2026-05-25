// apps/api/src/modules/search/search.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

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
  ) {
    const parsedLimit = Math.min(Number(limit ?? 20), 100);

    return this.searchService.search(q ?? '', {
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
      page:  Number(page ?? 1),
      limit: parsedLimit,
    });
  }

  /**
   * GET /search/autocomplete?q=toy
   * Returns up to 6 title suggestions for the search input dropdown.
   */
  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return this.searchService.autocomplete(q);
  }
}
