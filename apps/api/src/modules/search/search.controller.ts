import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { SearchService } from './search.service';
import { SearchProtectionService } from '../../common/throttler/search-protection.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchProtection: SearchProtectionService,
  ) {}

  @Get('listings')
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const ip = this.extractIp(req);
    this.searchProtection.checkSearchRate(ip);

    const safeQuery = this.searchProtection.validateQuery(q);
    if (!safeQuery) {
      throw new BadRequestException('Search query is required');
    }

    return this.searchService.search(safeQuery, type, page, limit);
  }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string, @Req() req: Request) {
    // ── Abuse prevention ────────────────────────────────────────────────────
    const ip = this.extractIp(req);
    this.searchProtection.checkAutocompleteRate(ip);

    const safeQuery = this.searchProtection.validateQuery(q);
    return this.searchService.autocomplete(safeQuery);
  }

  @Post('advanced')
  async advancedSearch(@Body() query: any, @Req() req: Request) {
    const ip = this.extractIp(req);
    this.searchProtection.checkSearchRate(ip);

    if (!query || typeof query !== 'object') {
      throw new BadRequestException('Search query must be an object');
    }

    return this.searchService.advancedSearch(query);
  }

  @Get('suggestions')
  async suggestions(@Query('q') q: string, @Req() req: Request) {
    const ip = this.extractIp(req);
    this.searchProtection.checkAutocompleteRate(ip);

    const safeQuery = this.searchProtection.validateQuery(q);
    return this.searchService.suggestions(safeQuery);
  }

  // FIX: Added null safety check on forwarded header
  private extractIp(req: Request | undefined): string {
    if (!req) return 'unknown';

    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // FIX: Check if forwarded is defined before attempting to access it
      const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
        ?.split(',')?.[0]
        ?.trim();
      if (first) return first;
    }

    return req.socket?.remoteAddress ?? (req as any).ip ?? 'unknown';
  }
}
