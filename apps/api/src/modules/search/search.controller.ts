// apps/api/src/modules/search/search.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /search
   *
   * Query params:
   *   q          – free-text keyword
   *   type       – listing type (CAR, TRUCK, …)
   *   brandId    – filter by brand
   *   modelId    – filter by model (brand must match)
   *   trimId     – filter by specific trim
   *   year       – exact model year
   *   minYear    – year range lower bound
   *   maxYear    – year range upper bound
   *   condition  – NEW | USED
   *   minPrice   – price range lower bound
   *   maxPrice   – price range upper bound
   *   locationId – location filter
   *   page       – 1-based page number (default 1)
   *   limit      – results per page (default 20)
   *
   * All params are optional and compose together.
   */
  @Get()
  search(
    @Query('q')          q:          string,
    @Query('type')       type:       string,
    @Query('brandId')    brandId:    string,
    @Query('modelId')    modelId:    string,
    @Query('trimId')     trimId:     string,
    @Query('year')       year:       string,
    @Query('minYear')    minYear:    string,
    @Query('maxYear')    maxYear:    string,
    @Query('condition')  condition:  string,
    @Query('minPrice')   minPrice:   string,
    @Query('maxPrice')   maxPrice:   string,
    @Query('locationId') locationId: string,
    @Query('page')       page:       string,
    @Query('limit')      limit:      string,
  ) {
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
      page:  Number(page  ?? 1),
      limit: Number(limit ?? 20),
    });
  }
}
