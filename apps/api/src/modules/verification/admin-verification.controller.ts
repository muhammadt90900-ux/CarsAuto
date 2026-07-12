/**
 * apps/api/src/modules/verification/admin-verification.controller.ts
 *
 * Admin-facing surface for Trust & Safety Prompt 2's ID verification queue.
 * Kept as its own small controller (mounted at /admin/verification) rather
 * than added into admin.controller.ts, mirroring FraudController's exact
 * precedent (see that file's header comment) — reuses the same guard stack
 * (JwtAuthGuard + AdminGuard).
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { VerificationService } from './verification.service';
import { RejectVerificationDto } from './dto/reject-verification.dto';

const DEFAULT_PAGE_LIMIT = 20;

@ApiTags('admin-verification')
@ApiBearerAuth('bearer')
@Controller('admin/verification')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminVerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /** Review queue — defaults to PENDING, oldest first (first submitted, first reviewed). */
  @Get('queue')
  async queue(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(DEFAULT_PAGE_LIMIT), ParseIntPipe) limit: number,
    @Query('status', new DefaultValuePipe('PENDING')) status: string,
  ) {
    return this.verificationService.getQueue(page, limit, status);
  }

  @Post(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const adminId = (req as any).user?.userId ?? (req as any).user?.sub;
    return this.verificationService.approve(id, adminId);
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectVerificationDto,
    @Req() req: Request,
  ) {
    const adminId = (req as any).user?.userId ?? (req as any).user?.sub;
    return this.verificationService.reject(id, adminId, dto.reason);
  }
}
