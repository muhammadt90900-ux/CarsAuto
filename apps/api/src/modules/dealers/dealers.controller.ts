// apps/api/src/modules/dealers/dealers.controller.ts — FEATURE 9: Follower System added

import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { DealersService } from './dealers.service';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { DealerQueryDto } from './dto/dealer-query.dto';
import { ContactDealerDto } from './dto/contact-dealer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { DealerTier } from '../../common/prisma/enums';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dealers')
@Controller('dealers')
export class DealersController {
  constructor(private readonly service: DealersService) {}

  // ── Public endpoints ───────────────────────────────────────────────────

  /** GET /dealers — marketplace listing */
  @Get()
  findAll(@Query() query: DealerQueryDto) {
    return this.service.findAll(query);
  }

  /** GET /dealers/me/following — dealers the current user follows. MUST be before :slug. */
  @Get('me/following')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  getFollowedDealers(@Request() req: any) {
    return this.service.getFollowedDealers(req.user.userId);
  }

  /** GET /dealers/me/analytics?days=30 */
  @Get('me/analytics')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  analytics(@Request() req: any, @Query('days') days = 30) {
    return this.service.getAnalytics(req.user.userId, +days);
  }

  /** GET /dealers/:slug — public showroom (attaches isFollowing if authenticated) */
  @Get(':slug')
  @UseGuards(OptionalJwtGuard)
  findOne(@Param('slug') slug: string, @Request() req: any) {
    return this.service.findBySlug(slug, req.user?.userId);  // F10 fix: JwtStrategy returns { userId } not { id }
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

  /** GET /dealers/:id/followers — paginated follower list (public) */
  @Get(':id/followers')
  getFollowers(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.getFollowers(id, +page, +limit);
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

  // ── Follower endpoints (authenticated) ─────────────────────────────────

  /** POST /dealers/:id/follow */
  @Post(':id/follow')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  follow(@Param('id') id: string, @Request() req: any) {
    return this.service.follow(req.user.userId, id);
  }

  /** DELETE /dealers/:id/follow */
  @Delete(':id/follow')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  unfollow(@Param('id') id: string, @Request() req: any) {
    return this.service.unfollow(req.user.userId, id);
  }

  // ── Authenticated + verified dealer endpoints ──────────────────────────

  /** POST /dealers — create dealer profile (verified email required) */
  @Post()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  create(@Body() dto: CreateDealerDto, @Request() req: any) {
    return this.service.create(req.user.userId, dto);
  }

  /** PATCH /dealers/me — update own dealer profile (verified email required) */
  @Patch('me')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  update(@Body() dto: UpdateDealerDto, @Request() req: any) {
    return this.service.update(req.user.userId, dto);
  }

  // ── Review endpoint (authenticated + verified buyer) ───────────────────

  /** POST /dealers/:slug/reviews — verified email required */
  @Post(':slug/reviews')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  createReview(
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    return this.service.createReview(req.user.userId, slug, dto);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────

  /** PATCH /dealers/:id/verify */
  @Patch(':id/verify')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  verify(
    @Param('id') id: string,
    @Body('tier') tier: DealerTier,
    @Request() req: any,
  ) {
    return this.service.verify(id, req.user.userId, tier);
  }

  /** PATCH /dealers/:id/suspend */
  @Patch(':id/suspend')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }
}
