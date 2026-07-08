/**
 * apps/api/src/modules/fraud/fraud.controller.ts
 *
 * Admin-facing surface for Prompt 4's FraudScoringService. Kept as its own
 * small controller (mounted at /admin/fraud) rather than added into the
 * already-large admin.controller.ts, but reuses that controller's exact
 * guard stack (JwtAuthGuard + AdminGuard) — this is admin-only data.
 */

import { Controller, Get, Post, Param, Query, UseGuards, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { FraudScoringService } from './fraud-scoring.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const DEFAULT_PAGE_LIMIT = 20;

@ApiTags('admin-fraud')
@ApiBearerAuth()
@Controller('admin/fraud')
@UseGuards(JwtAuthGuard, AdminGuard)
export class FraudController {
  constructor(
    private readonly fraudScoring: FraudScoringService,
    private readonly prisma: PrismaService,
  ) {}

  /** Riskiest accounts first — the admin fraud review queue. */
  @Get('queue')
  async queue(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(DEFAULT_PAGE_LIMIT), ParseIntPipe) limit: number,
    @Query('minRisk', new DefaultValuePipe(0), ParseIntPipe) minRisk: number,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [scores, total] = await Promise.all([
      this.prisma.fraudScore.findMany({
        where: { overallRisk: { gte: minRisk } },
        orderBy: { overallRisk: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { user: { select: { id: true, name: true, email: true, banned: true, createdAt: true } } },
      }),
      this.prisma.fraudScore.count({ where: { overallRisk: { gte: minRisk } } }),
    ]);

    return { data: scores, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  /** Current score for one account — read-only, no recompute. */
  @Get(':userId')
  async getScore(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.prisma.fraudScore.findUnique({ where: { userId } });
  }

  /** On-demand recompute — e.g. an admin reviewing a report wants a fresh score, not last night's. */
  @Post(':userId/recompute')
  async recompute(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.fraudScoring.scoreAccount(userId);
  }
}
