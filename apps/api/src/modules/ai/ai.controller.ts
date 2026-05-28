// apps/api/src/modules/ai/ai.controller.ts
import {
  Controller, Post, Get, Body, Query,
  UseGuards, Request, ParseIntPipe,
  DefaultValuePipe, Optional,
} from '@nestjs/common';
import { AiService, RecommendationContext } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /* POST /ai/suggest-price */
  @Post('suggest-price')
  suggestPrice(
    @Body() body: { make: string; model: string; year: number; mileage: number },
  ) {
    return this.aiService.suggestPrice(body.make, body.model, body.year, body.mileage);
  }

  /* GET /ai/similar?listingId=&locale=&limit= */
  @Get('similar')
  similarCars(
    @Query('listingId') listingId: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
  ) {
    return this.aiService.similarCars(listingId, locale, limit);
  }

  /* GET /ai/budget?budget=&currency=&country=&locale=&limit= */
  @Get('budget')
  byBudget(
    @Query('budget', ParseIntPipe) budget: number,
    @Query('currency') currency = 'USD',
    @Query('country') country?: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.aiService.byBudget(budget, currency, country, locale, limit);
  }

  /* POST /ai/search-history  — body: { searches: string[], locale?, limit? } */
  @Post('search-history')
  bySearchHistory(
    @Body() body: { searches: string[]; locale?: string; limit?: number },
  ) {
    return this.aiService.bySearchHistory(
      body.searches,
      undefined,
      body.locale ?? 'en',
      body.limit ?? 8,
    );
  }

  /* GET /ai/country?country=IQ&locale=ku&limit=8 */
  @Get('country')
  byCountry(
    @Query('country') country: string,
    @Query('locale') locale = 'en',
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.aiService.byCountry(country, locale, limit);
  }

  /* POST /ai/personalised  — authenticated; combines all signals */
  @UseGuards(JwtAuthGuard)
  @Post('personalised')
  personalised(
    @Request() req: any,
    @Body() body: Omit<RecommendationContext, 'userId'>,
  ) {
    return this.aiService.personalised({ ...body, userId: req.user.userId });
  }

  /* POST /ai/recommend  — public all-in-one endpoint */
  @Post('recommend')
  recommend(@Body() body: RecommendationContext) {
    return this.aiService.recommend(body);
  }
}
