// apps/api/src/modules/search/search.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q')            q: string,
    @Query('type')         type: string,
    @Query('makeId')       makeId: string,
    @Query('modelId')      modelId: string,
    @Query('yearFrom')     yearFrom: string,
    @Query('yearTo')       yearTo: string,
    @Query('fuelType')     fuelType: string,
    @Query('transmission') transmission: string,
    @Query('driveType')    driveType: string,
    @Query('bodyType')     bodyType: string,
    @Query('condition')    condition: string,
    @Query('page')         page: string,
    @Query('limit')        limit: string,
  ) {
    return this.searchService.search(
      q ?? '',
      type,
      makeId,
      modelId,
      yearFrom ? Number(yearFrom) : undefined,
      yearTo   ? Number(yearTo)   : undefined,
      fuelType,
      transmission,
      driveType,
      bodyType,
      condition,
      Number(page  ?? 1),
      Number(limit ?? 20),
    );
  }
}
