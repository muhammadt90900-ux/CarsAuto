// apps/api/src/modules/reviews/reviews.controller.ts

import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { ReviewsService } from './reviews.service';
import { CreateUserReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** POST /reviews — verified email required, same convention as dealer reviews. */
  @Post('reviews')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  create(@Body() dto: CreateUserReviewDto, @Req() req: Request) {
    const reviewerId = (req as any).user?.userId ?? (req as any).user?.sub;
    return this.reviews.create(reviewerId, dto);
  }

  /** GET /users/:userId/reviews — public, no auth required. */
  @Get('users/:userId/reviews')
  findByUser(
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.reviews.findByReviewee(userId, page, limit);
  }
}
