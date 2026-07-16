/**
 * apps/api/src/modules/notifications/admin-notifications.controller.ts
 *
 * ADMIN FIX: the admin/notifications frontend page (apps/web/src/app/
 * [locale]/admin/notifications/page.tsx) called GET /admin/notifications and
 * POST /admin/notifications/send, but neither the route nor a backing data
 * model existed anywhere in the API — the per-user `Notification` model has
 * no concept of a "campaign" an admin composed. Every load of this admin
 * page 404'd.
 *
 * Kept as its own small controller (mounted at /admin/notifications) rather
 * than merged into NotificationsController, mirroring the existing
 * AdminVerificationController / AdminSuspiciousActivityController precedent —
 * reuses the same guard stack (JwtAuthGuard + AdminGuard).
 */

import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { NotificationsService } from './notifications.service';

class SendAdminNotificationDto {
  @IsString() @MinLength(1) @MaxLength(120)
  title!: string;

  @IsString() @MinLength(1) @MaxLength(500)
  body!: string;

  @IsIn(['ANNOUNCEMENT', 'ALERT', 'PROMOTION', 'MAINTENANCE'])
  type!: string;

  @IsIn(['ALL', 'USERS', 'DEALERS', 'PREMIUM'])
  audience!: 'ALL' | 'USERS' | 'DEALERS' | 'PREMIUM';
}

@ApiTags('admin-notifications')
@ApiBearerAuth('bearer')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** GET /admin/notifications?page=1&limit=20&status= */
  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.notificationsService.adminListNotifications({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  /** POST /admin/notifications/send */
  @Post('send')
  send(@Request() req: any, @Body() dto: SendAdminNotificationDto) {
    return this.notificationsService.adminSendNotification(req.user.userId, dto);
  }
}
