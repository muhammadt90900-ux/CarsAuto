/**
 * apps/api/src/modules/subscriptions/admin-subscriptions.controller.ts
 *
 * ADMIN FIX: the admin/subscriptions frontend page (apps/web/src/app/
 * [locale]/admin/subscriptions/page.tsx) called GET /admin/subscriptions/dealers
 * and GET /admin/subscriptions/users, but SubscriptionsController only ever
 * exposed user-scoped /subscriptions/* routes — no admin-prefixed route
 * existed. Every load of this admin page 404'd.
 *
 * Kept as its own small controller (mounted at /admin/subscriptions) rather
 * than merged into SubscriptionsController, mirroring the existing
 * AdminVerificationController / AdminSuspiciousActivityController precedent —
 * reuses the same guard stack (JwtAuthGuard + AdminGuard).
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('admin-subscriptions')
@ApiBearerAuth('bearer')
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /** GET /admin/subscriptions/dealers?page=1&limit=20&plan=&status= */
  @Get('dealers')
  listDealers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
  ) {
    return this.subscriptionsService.adminListDealerSubscriptions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      plan,
      status,
    });
  }

  /** GET /admin/subscriptions/users?page=1&limit=20&status= */
  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.subscriptionsService.adminListUserSubscriptions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }
}
