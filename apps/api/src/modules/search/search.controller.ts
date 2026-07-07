import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { SearchService } from './search.service';
import { SearchProtectionService } from '../../common/throttler/search-protection.service';
import { AdvancedSearchDto } from './dto/advanced-search.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Search')
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
    @Query('locale') locale?: string,
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('minYear') minYear?: string,
    @Query('maxYear') maxYear?: string,
    @Query('fuelType') fuelType?: string,
    @Query('transmission') transmission?: string,
    @Query('condition') condition?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Req() req?: Request,
  ) {
    const ip = this.extractIp(req);
    this.searchProtection.checkSearchRate(ip);

    const safeQuery = this.searchProtection.validateQuery(q);
    if (!safeQuery) {
      throw new BadRequestException('Search query is required');
    }

    // FIX: pass as options object to match SearchService.search(q, options)
    return this.searchService.search(safeQuery, {
      type,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      locale,
      brandId,
      modelId,
      minYear,
      maxYear,
      fuelType,
      transmission,
      condition,
      minPrice,
      maxPrice,
      // Phase 3: geo radius — all three must be present together (see
      // SearchService.search()'s SearchFilters.lat/lng/radiusKm comment).
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
    });
  }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string, @Req() req: Request) {
    const ip = this.extractIp(req);
    this.searchProtection.checkAutocompleteRate(ip);

    const safeQuery = this.searchProtection.validateQuery(q);
    return this.searchService.autocomplete(safeQuery);
  }

  @Post('advanced')
  async advancedSearch(@Body() query: AdvancedSearchDto, @Req() req: Request) {
    const ip = this.extractIp(req);
    this.searchProtection.checkSearchRate(ip);

    // NOTE (Search Architecture Phase 2 audit): SearchService.advancedSearch()
    // also does not exist on the class — same latent bug as `suggestions()`
    // had (see SearchService.suggestions()'s header comment). Out of scope
    // for this phase (not part of the instant-search/autosuggest work);
    // flagging here so it isn't mistaken for working. POST /search/advanced
    // currently 500s at runtime.
    return this.searchService.advancedSearch(query);
  }

  @Get('suggestions')
  async suggestions(@Query('q') q: string, @Query('locale') locale?: string, @Req() req?: Request) {
    const ip = this.extractIp(req);
    this.searchProtection.checkAutocompleteRate(ip);

    const safeQuery = this.searchProtection.validateQuery(q);
    return this.searchService.suggestions(safeQuery, locale);
  }

  // Search Architecture Phase 4: fired by the frontend when a user clicks
  // a search result card — see SearchService.recordClick()'s header
  // comment. No auth required (works for anonymous browsers); light rate
  // limiting reuses the same autocomplete bucket since a single click
  // carries the same low-cost/low-abuse-risk profile as an autocomplete
  // keystroke, not a full search.
  @Post('click')
  async click(@Body() body: { listingId?: string; searchEventId?: string }, @Req() req: Request) {
    const ip = this.extractIp(req);
    this.searchProtection.checkAutocompleteRate(ip);

    if (!body?.listingId) {
      throw new BadRequestException('listingId is required');
    }
    await this.searchService.recordClick(body.listingId, body.searchEventId);
    return { ok: true };
  }

  /**
   * FEATURE 2B: Semantic search using pgvector cosine similarity.
   * Falls back to ILIKE keyword search if OpenAI is unavailable.
   * GET /search/semantic?q=سووپەری+کامری+2020
   */
  @Get('semantic')
  async semanticSearch(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('locationId') locationId?: string,
    @Query('condition') condition?: string,
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

    return this.searchService.semanticSearch(safeQuery, {
      type,
      minPrice,
      maxPrice,
      locationId,
      condition,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  /**
   * Prompt 2: Smart search — combines LLM-based natural-language filter
   * extraction with the existing keyword/Meilisearch search, falling back
   * to the existing semantic (pgvector) search on thin results.
   * POST /search/smart
   *
   * Uses the same SearchProtectionService.checkSearchRate(ip) pattern as
   * every other search route in this controller — NOT @Throttle, which
   * this codebase's search module doesn't use anywhere (checked before
   * writing this: search.controller.ts has zero @Throttle decorators).
   */
  @Post('smart')
  async smartSearch(
    @Body() body: { query?: string; locale?: string },
    @Req() req: Request,
  ) {
    const ip = this.extractIp(req);
    this.searchProtection.checkSearchRate(ip);

    const safeQuery = this.searchProtection.validateQuery(body?.query);
    if (!safeQuery) {
      throw new BadRequestException('query is required');
    }

    return this.searchService.smartSearch(safeQuery, body?.locale ?? 'ku');
  }

  private extractIp(req: Request | undefined): string {
    // F6 fix: use req.ip which respects the trust proxy setting from main.ts
    // instead of manually re-parsing X-Forwarded-For (which an attacker can spoof).
    if (!req) return 'unknown';
    return (req as any).ip ?? 'unknown';
  }
}
