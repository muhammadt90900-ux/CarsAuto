// apps/api/src/modules/dealers/dealers.controller.ts

import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { DealersService } from './dealers.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { DealerQueryDto } from './dto/dealer-query.dto';
import { ContactDealerDto } from './dto/contact-dealer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { DealerTier } from '../../common/prisma/enums';

@Controller('dealers')
export class DealersController {
  constructor(private readonly service: DealersService) {}

  // ── Public endpoints ───────────────────────────────────────────────────

  /** GET /dealers — marketplace listing */
  @Get()
  findAll(@Query() query: DealerQueryDto) {
    return this.service.findAll(query);
  }

  /** GET /dealers/:slug — public showroom */
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  /** GET /dealers/:slug/reviews */
  @Get(':slug/reviews')
  getReviews(
    @Param('slug') slug: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.getReviews(slug, +page, +limit);
  }

  /** POST /dealers/:slug/contact — contact form + WhatsApp */
  @Post(':slug/contact')
  @UseGuards(OptionalJwtGuard)
  @HttpCode(HttpStatus.OK)
  contact(
    @Param('slug') slug: string,
    @Body() dto: ContactDealerDto,
    @Request() req: any,
  ) {
    return this.service.contactDealer(slug, dto, req.user?.id);
  }

  // ── Authenticated + verified dealer endpoints ──────────────────────────

  /** POST /dealers — create dealer profile (verified email required) */
  @Post()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  create(@Body() dto: CreateDealerDto, @Request() req: any) {
    return this.service.create(req.user.id, dto);
  }

  /** PATCH /dealers/me — update own dealer profile (verified email required) */
  @Patch('me')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  update(@Body() dto: UpdateDealerDto, @Request() req: any) {
    return this.service.update(req.user.id, dto);
  }

  /** GET /dealers/me/analytics?days=30 */
  @Get('me/analytics')
  @UseGuards(JwtAuthGuard)
  analytics(@Request() req: any, @Query('days') days = 30) {
    return this.service.getAnalytics(req.user.id, +days);
  }

  // ── Review endpoint (authenticated + verified buyer) ───────────────────

  /** POST /dealers/:slug/reviews — verified email required */
  @Post(':slug/reviews')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  createReview(
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    return this.service.createReview(req.user.id, slug, dto);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────

  /** PATCH /dealers/:id/verify */
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, AdminGuard)
  verify(
    @Param('id') id: string,
    @Body('tier') tier: DealerTier,
    @Request() req: any,
  ) {
    return this.service.verify(id, req.user.id, tier);
  }

  /** PATCH /dealers/:id/suspend */
  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, AdminGuard)
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }
}
