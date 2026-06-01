// apps/api/src/modules/listings/listings.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsOptional, IsString, IsNumberString, IsEnum, MaxLength } from 'class-validator';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingType, ListingCondition, FuelType, TransmissionType } from '@prisma/client';

// FIX: Typed query DTO replaces `@Query() query: any` which accepted arbitrary strings
class ListingQueryDto {
  @IsOptional() @IsEnum(ListingType)          type?: string;
  @IsOptional() @IsNumberString()             minPrice?: string;
  @IsOptional() @IsNumberString()             maxPrice?: string;
  @IsOptional() @IsString() @MaxLength(40)    locationId?: string;
  @IsOptional() @IsString() @MaxLength(40)    brandId?: string;
  @IsOptional() @IsString() @MaxLength(40)    modelId?: string;
  @IsOptional() @IsString() @MaxLength(40)    trimId?: string;
  @IsOptional() @IsNumberString()             year?: string;
  @IsOptional() @IsNumberString()             minYear?: string;
  @IsOptional() @IsNumberString()             maxYear?: string;
  @IsOptional() @IsEnum(ListingCondition)     condition?: string;
  @IsOptional() @IsEnum(FuelType)             fuelType?: string;
  @IsOptional() @IsEnum(TransmissionType)     transmission?: string;
  @IsOptional() @IsString() @MaxLength(40)    color?: string;
  @IsOptional() @IsNumberString()             minMileage?: string;
  @IsOptional() @IsNumberString()             maxMileage?: string;
  @IsOptional() @IsNumberString()             page?: string;
  @IsOptional() @IsNumberString()             limit?: string;
}

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ── Public endpoints (no verification required) ──────────────────────────

  @Get()
  findAll(@Query() query: ListingQueryDto) {
    return this.listingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingsService.findOne(id);
  }

  // ── Authenticated + verified endpoints ───────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('my')
  myListings(@Request() req: any) {
    return this.listingsService.myListings(req.user.userId);
  }

  /** Creating a listing requires a verified email */
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreateListingDto) {
    return this.listingsService.create({ ...dto, userId: req.user.userId });
  }

  /** Editing a listing requires a verified email */
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateListingDto>,
  ) {
    return this.listingsService.update(id, req.user.userId, dto);
  }

  /** Deleting a listing requires a verified email */
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.listingsService.delete(id, req.user.userId);
  }
}
