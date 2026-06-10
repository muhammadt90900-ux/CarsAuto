// apps/api/src/modules/listings/listings.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  IsOptional, IsString, IsNumberString,
  IsEnum, MaxLength, validate,
} from 'class-validator';
import { ListingsService, type ListingQueryParams } from './listings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingType, ListingCondition, FuelType, TransmissionType } from '../../common/prisma/enums';

// ── Typed query DTO ───────────────────────────────────────────────────────────
class ListingQueryDto implements ListingQueryParams {
  @IsOptional() @IsEnum(ListingType)        type?: string;
  @IsOptional() @IsNumberString()           minPrice?: string;
  @IsOptional() @IsNumberString()           maxPrice?: string;
  @IsOptional() @IsString() @MaxLength(40)  locationId?: string;
  @IsOptional() @IsString() @MaxLength(40)  brandId?: string;
  @IsOptional() @IsString() @MaxLength(40)  modelId?: string;
  @IsOptional() @IsString() @MaxLength(40)  trimId?: string;
  @IsOptional() @IsNumberString()           year?: string;
  @IsOptional() @IsNumberString()           minYear?: string;
  @IsOptional() @IsNumberString()           maxYear?: string;
  @IsOptional() @IsEnum(ListingCondition)   condition?: string;
  @IsOptional() @IsEnum(FuelType)           fuelType?: string;
  @IsOptional() @IsEnum(TransmissionType)   transmission?: string;
  @IsOptional() @IsString() @MaxLength(40)  color?: string;
  @IsOptional() @IsNumberString()           minMileage?: string;
  @IsOptional() @IsNumberString()           maxMileage?: string;
  @IsOptional() @IsNumberString()           page?: string;
  @IsOptional() @IsNumberString()           limit?: string;
  @IsOptional() @IsString()                 featured?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(40)  sortBy?: string;
  @IsOptional() @IsString() @MaxLength(10)  sortOrder?: string;
}

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ── Public endpoints ──────────────────────────────────────────────────────

  @Get()
  findAll(@Query() query: ListingQueryDto) {
    return this.listingsService.findAll(query);
  }

  // ── Authenticated endpoints ───────────────────────────────────────────────
  // IMPORTANT: All static-segment routes (@Get('my'), @Get('featured'), etc.)
  // MUST be declared BEFORE @Get(':id'). NestJS matches routes in declaration
  // order — if ':id' comes first, 'my' is treated as a UUID parameter and
  // routed to findOne() instead, causing a 500 (ParseUUIDPipe rejects 'my').

  @UseGuards(JwtAuthGuard)
  @Get('my')
  myListings(@Request() req: any) {
    return this.listingsService.myListings(req.user.userId);
  }

  // ── Parameterised public endpoint — must come AFTER all static routes ─────

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingsService.findOne(id);
  }

  // ── Remaining authenticated endpoints ─────────────────────────────────────

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: any, @Body() dto: CreateListingDto) {
    return this.listingsService.create({ ...dto, userId: req.user.userId });
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateListingDto>,
  ) {
    return this.listingsService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.listingsService.delete(id, req.user.userId);
  }
}
