/**
 * apps/api/src/modules/ai/ai.controller.ts
 *
 * FEATURE 2C: suggestPrice() now accepts full params (condition, location).
 * All other endpoints preserved.
 */
import {
  Controller, Post, Get, Body, Query,
  UseGuards, Request, ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  IsString, IsNumber, Min, Max, MaxLength,
  IsOptional, IsArray, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AiService, RecommendationContext } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class SuggestPriceDto {
  @IsString() @MaxLength(80)
  make!: string;

  @IsString() @MaxLength(80)
  model!: string;

  @IsNumber() @Min(1900) @Max(new Date().getFullYear() + 1) @Type(() => Number)
  year!: number;

  @IsNumber() @Min(0) @Max(2_000_000) @Type(() => Number)
  mileage!: number;

  @IsOptional() @IsString() @MaxLength(20)
  condition?: string;

  @IsOptional() @IsString() @MaxLength(100)
  location?: string;
}

class SearchHistoryDto {
  @IsArray() @ArrayMaxSize(20, { message: 'Too many search terms' }) @IsString({ each: true })
  searches!: string[];

  @IsOptional() @IsString() @MaxLength(10)
  locale?: string;

  @IsOptional() @IsNumber() @Min(1) @Max(20) @Type(() => Number)
  limit?: number;
}

@Controller('ai')
@UseGuards(ThrottlerGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** FEATURE 2C: Enhanced price suggestion with condition + location */
  // F9 fix: tight per-IP limit — this endpoint triggers a live OpenAI call on cache miss.
  // Global default (60/min) is far too permissive for an unauthenticated AI endpoint.
  @Post('suggest-price')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  suggestPrice(@Body() body: SuggestPriceDto) {
    return this.aiService.suggestPrice(
      body.make,
      body.model,
      body.year,
      body.mileage,
      body.condition,
      body.location,
    );
  }

  // F9 fix: cap unauthenticated AI endpoints to limit OpenAI cost amplification
  @Get('similar')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  similarCars(
    @Query('listingId') listingId: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    return this.aiService.similarCars(listingId, locale, Math.min(limit, 20));
  }

  @Get('budget')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  byBudget(
    @Query('budget', ParseIntPipe) budget: number,
    @Query('currency') currency = 'USD',
    @Query('country') country?: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit = 8,
  ) {
    return this.aiService.byBudget(budget, currency, country, locale, Math.min(limit, 20));
  }

  @Post('search-history')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  bySearchHistory(@Body() body: SearchHistoryDto) {
    return this.aiService.bySearchHistory(
      body.searches,
      undefined,
      body.locale ?? 'en',
      Math.min(body.limit ?? 8, 20),
    );
  }

  @Get('country')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  byCountry(
    @Query('country') country: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.aiService.byCountry(country, locale, Math.min(limit, 20));
  }

  @UseGuards(JwtAuthGuard)
  @Post('personalised')
  personalised(
    @Request() req: any,
    @Body() body: Omit<RecommendationContext, 'userId'>,
  ) {
    return this.aiService.personalised({ ...body, userId: req.user.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Post('recommend')
  recommend(@Body() body: RecommendationContext) {
    return this.aiService.recommend(body);
  }
}
