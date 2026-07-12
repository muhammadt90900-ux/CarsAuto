/**
 * apps/api/src/modules/suspicious-activity/admin-suspicious-activity.controller.ts
 *
 * Trust & Safety Prompt 5. Sibling to FraudController (mounted at
 * /admin/fraud) rather than a new method on it — the doc asked for
 * GET /admin/suspicious-activity specifically, a different top-level path
 * than /admin/fraud/*, which a single NestJS controller class can't split
 * across two prefixes. Reuses FraudController's exact guard stack
 * (JwtAuthGuard + AdminGuard), per instruction.
 */

import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SuspiciousActivityService } from './suspicious-activity.service';

const DEFAULT_PAGE_LIMIT = 20;

@ApiTags('admin-suspicious-activity')
@ApiBearerAuth()
@Controller('admin/suspicious-activity')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSuspiciousActivityController {
  constructor(private readonly suspiciousActivity: SuspiciousActivityService) {}

  /** Highest severity, most recent first — filterable by eventType and/or minSeverity. */
  @Get()
  async queue(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(DEFAULT_PAGE_LIMIT), ParseIntPipe) limit: number,
    @Query('eventType') eventType?: string,
    @Query('minSeverity') minSeverity?: string,
  ) {
    return this.suspiciousActivity.getQueue(
      page,
      limit,
      eventType,
      minSeverity !== undefined ? Number(minSeverity) : undefined,
    );
  }
}
