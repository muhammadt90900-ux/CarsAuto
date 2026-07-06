// apps/api/src/modules/listings/listings.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  IsOptional, IsString, IsNumberString,
  IsEnum, MaxLength, IsBooleanString,
} from 'class-validator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ListingsService, type ListingQueryParams, type OffsetListingsResponse, type CursorListingsResponse } from './listings.service';
import { JwtAuthGuard }          from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard }      from '../auth/guards/optional-jwt.guard';
import { EmailVerifiedGuard }    from '../../common/guards/email-verified.guard';
import { CreateListingDto }      from './dto/create-listing.dto';
import { ListingType, ListingCondition, FuelType, TransmissionType } from '../../common/prisma/enums';
import { ListingPermissionService } from '../../common/permissions/listing-permission.service';

// ── Typed query DTO ───────────────────────────────────────────────────────────
class ListingQueryDto implements ListingQueryParams {
  @IsOptional() @IsEnum(ListingType)        type?:         string;
  @IsOptional() @IsNumberString()           minPrice?:     string;
  @IsOptional() @IsNumberString()           maxPrice?:     string;
  @IsOptional() @IsString() @MaxLength(40)  locationId?:   string;
  @IsOptional() @IsString() @MaxLength(40)  brandId?:      string;
  @IsOptional() @IsString() @MaxLength(40)  modelId?:      string;
  @IsOptional() @IsString() @MaxLength(40)  trimId?:       string;
  @IsOptional() @IsNumberString()           year?:         string;
  @IsOptional() @IsNumberString()           minYear?:      string;
  @IsOptional() @IsNumberString()           maxYear?:      string;
  @IsOptional() @IsEnum(ListingCondition)   condition?:    string;
  @IsOptional() @IsEnum(FuelType)           fuelType?:     string;
  @IsOptional() @IsEnum(TransmissionType)   transmission?: string;
  @IsOptional() @IsString() @MaxLength(40)  color?:        string;
  @IsOptional() @IsNumberString()           minMileage?:   string;
  @IsOptional() @IsNumberString()           maxMileage?:   string;
  @IsOptional() @IsNumberString()           page?:         string;
  @IsOptional() @IsNumberString()           limit?:        string;
  // F-HIGH fix: cursor-based pagination — opaque, base64-encoded listing id.
  // If sent, takes priority over `page` (see ListingsService.findAll()).
  // Existing callers that only ever send `page` are completely unaffected.
  @IsOptional() @IsString() @MaxLength(512) cursor?:       string;
  @IsOptional() @IsString()                 featured?:     string;
  @IsOptional() @IsString() @MaxLength(100) search?:       string;
  @IsOptional() @IsString() @MaxLength(40)  sortBy?:       string;
  @IsOptional() @IsString() @MaxLength(10)  sortOrder?:    string;
  // Feature 3 — accessory / service filters
  @IsOptional() @IsString() @MaxLength(60)  serviceType?:  string;
  @IsOptional() @IsBooleanString()          mobile?:       string;
  // Search Architecture Phase 3 — "near me" (bounding-box approximation,
  // see ListingsService.buildWhereClause()'s geo comment). All three must
  // be present together.
  @IsOptional() @IsNumberString()           lat?:          string;
  @IsOptional() @IsNumberString()           lng?:          string;
  @IsOptional() @IsNumberString()           radiusKm?:     string;
}

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService:    ListingsService,
    private readonly permissionService:  ListingPermissionService,
  ) {}

  // ── Public endpoints ──────────────────────────────────────────────────────

  // OptionalJwtGuard: never blocks unauthenticated requests — populates
  // req.user only when a valid JWT is present. This lets findAll() attach
  // isFavorited flags for logged-in users without throwing for public callers.
  @ApiOperation({
    summary: 'List/search listings — supports offset pagination (page) and cursor pagination (cursor)',
    description: 'If `cursor` is provided, returns { data, nextCursor, hasMore, total }. Otherwise returns { data, total, page, limit, totalPages }.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of listings (shape depends on page vs cursor mode)' })
  @UseGuards(OptionalJwtGuard)
  @Get()
  findAll(
    @Query() query: ListingQueryDto,
    @Request() req: any,
  ): Promise<OffsetListingsResponse | CursorListingsResponse> {
    return this.listingsService.findAll(query, req.user?.userId);
  }

  // IMPORTANT: Static-segment routes MUST be declared BEFORE @Get(':id').
  // NestJS matches in declaration order — 'my' would be misrouted as a UUID.

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: "Get the current user's own listings (any status)" })
  @UseGuards(JwtAuthGuard)
  @Get('my')
  myListings(@Request() req: any) {
    return this.listingsService.myListings(req.user.userId);
  }

  // Search Architecture Phase 3: same filter query params as the root
  // GET / above (reuses ListingQueryDto) — called by the marketplace
  // filter sidebar IN PARALLEL with its normal findAll() request, purely
  // to annotate each filter checkbox with a live count. Never affects
  // which listings findAll() itself returns.
  @ApiOperation({ summary: 'Facet counts (brand/model/year/fuelType/transmission/condition/featured) for the given filters' })
  @ApiResponse({ status: 200, description: 'Facet distribution — empty object if the search index is unavailable' })
  @UseGuards(OptionalJwtGuard)
  @Get('facets')
  getFacets(@Query() query: ListingQueryDto) {
    return this.listingsService.getFacets(query);
  }

  // ── Parameterised public endpoint — must come AFTER all static routes ─────

  // F3 FIX: OptionalJwtGuard populates req.user when a valid token is present
  // but never blocks unauthenticated requests. The userId is forwarded to
  // findOne() so owners can see their own non-ACTIVE listings while
  // unauthenticated (and non-owner) callers get a 404.
  @ApiOperation({ summary: 'Get a single listing by id' })
  @ApiResponse({ status: 200, description: 'The listing' })
  @ApiResponse({ status: 404, description: 'Not found (or not visible to the current caller)' })
  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.listingsService.findOne(id, req.user?.userId);
  }

  // ── Remaining authenticated endpoints ─────────────────────────────────────

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a new listing' })
  @ApiResponse({ status: 201, description: 'The created listing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Email not verified, or posting limit reached' })
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateListingDto) {
    await this.permissionService.checkCanPost(req.user.userId);
    return this.listingsService.create({ ...dto, userId: req.user.userId });
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a listing owned by the current user' })
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateListingDto>,
  ) {
    return this.listingsService.update(id, req.user.userId, dto);
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a listing owned by the current user' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.listingsService.delete(id, req.user.userId);
  }
}
