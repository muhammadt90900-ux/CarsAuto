// apps/api/src/modules/ai/ai.controller.ts
import {
  Controller, Post, Get, Body, Query,
  UseGuards, Request, ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { IsString, IsNumber, Min, Max, MaxLength, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AiService, RecommendationContext } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// FIX: Typed DTO for price suggestion — was @Body() body: any (no validation)
class SuggestPriceDto {
  @IsString()
  @MaxLength(80)
  make!: string;

  @IsString()
  @MaxLength(80)
  model!: string;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  @Type(() => Number)
  year!: number;

  @IsNumber()
  @Min(0)
  @Max(2_000_000)
  @Type(() => Number)
  mileage!: number;
}

// FIX: Typed DTO for search history — was untyped, arrays of arbitrary size accepted
class SearchHistoryDto {
  @IsArray()
  @ArrayMaxSize(20, { message: 'Too many search terms' })
  @IsString({ each: true })
  searches!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number;
}

@Controller('ai')
@UseGuards(ThrottlerGuard)   // FIX: Rate-limit AI endpoints globally
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest-price')
  suggestPrice(@Body() body: SuggestPriceDto) {
    return this.aiService.suggestPrice(body.make, body.model, body.year, body.mileage);
  }

  @Get('similar')
  similarCars(
    @Query('listingId') listingId: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    // FIX: Clamp limit
    return this.aiService.similarCars(listingId, locale, Math.min(limit, 20));
  }

  @Get('budget')
  byBudget(
    @Query('budget', ParseIntPipe) budget: number,
    @Query('currency') currency = 'USD',
    @Query('country') country?: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit = 8,
  ) {
    return this.aiService.byBudget(budget, currency, country, locale, Math.min(limit, 20));
  }

  // FIX: Typed DTO replaces untyped body
  @Post('search-history')
  bySearchHistory(@Body() body: SearchHistoryDto) {
    return this.aiService.bySearchHistory(
      body.searches,
      undefined,
      body.locale ?? 'en',
      Math.min(body.limit ?? 8, 20),
    );
  }

  @Get('country')
  byCountry(
    @Query('country') country: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.aiService.byCountry(country, locale, Math.min(limit, 20));
  }

  // FIX: Authenticated endpoint — unchanged
  @UseGuards(JwtAuthGuard)
  @Post('personalised')
  personalised(
    @Request() req: any,
    @Body() body: Omit<RecommendationContext, 'userId'>,
  ) {
    return this.aiService.personalised({ ...body, userId: req.user.userId });
  }

  // FIX: /ai/recommend moved behind auth to prevent anonymous scraping
  @UseGuards(JwtAuthGuard)
  @Post('recommend')
  recommend(@Body() body: RecommendationContext) {
    return this.aiService.recommend(body);
  }
}
