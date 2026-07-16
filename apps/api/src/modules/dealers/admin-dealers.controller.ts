/**
 * apps/api/src/modules/dealers/admin-dealers.controller.ts
 *
 * ADMIN FIX: the admin/dealers frontend page (apps/web/src/app/[locale]/admin/dealers/page.tsx)
 * called GET /admin/dealers and PATCH /admin/dealers/:id/reject, but neither route
 * existed anywhere in the API — DealersController only exposed /dealers/:id/verify
 * and /dealers/:id/suspend (no admin-prefixed list or reject). Every load of this
 * admin page 404'd.
 *
 * Kept as its own small controller (mounted at /admin/dealers) rather than merged
 * into DealersController, mirroring the existing AdminVerificationController /
 * AdminSuspiciousActivityController precedent — reuses the same guard stack
 * (JwtAuthGuard + AdminGuard).
 */

import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DealersService } from './dealers.service';

@ApiTags('admin-dealers')
@ApiBearerAuth('bearer')
@Controller('admin/dealers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDealersController {
  constructor(private readonly dealersService: DealersService) {}

  /** GET /admin/dealers?status=PENDING&search=...&page=1&limit=20 */
  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dealersService.adminList({
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** PATCH /admin/dealers/:id/reject */
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.dealersService.reject(id);
  }
}
