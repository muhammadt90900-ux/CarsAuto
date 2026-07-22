// apps/api/src/modules/referrals/admin-referrals.controller.ts
//
// Mirrors the existing AdminDealersController / AdminSubscriptionsController
// precedent: its own small controller mounted at /admin/referrals, reusing
// the same guard stack (JwtAuthGuard + AdminGuard).

import { Controller, Get, Patch, Param, Query, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReferralsService } from './referrals.service';
import { AdminReferralQueryDto, RejectReferralDto } from './dto/referral.dto';

@ApiTags('admin-referrals')
@ApiBearerAuth('bearer')
@Controller('admin/referrals')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReferralsController {
  constructor(private readonly service: ReferralsService) {}

  /** GET /admin/referrals?status=&search=&page=&limit= */
  @Get()
  list(@Query() query: AdminReferralQueryDto) {
    return this.service.adminList(query);
  }

  /** GET /admin/referrals/stats — overview counters for the admin page header */
  @Get('stats')
  stats() {
    return this.service.adminStats();
  }

  /** GET /admin/referrals/leaderboard?limit= */
  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.service.adminLeaderboard(limit ? parseInt(limit, 10) : undefined);
  }

  /** GET /admin/referrals/tree/:dealerId — a dealer's own referral tree */
  @Get('tree/:dealerId')
  tree(@Param('dealerId') dealerId: string) {
    return this.service.adminTree(dealerId);
  }

  /** GET /admin/referrals/export — CSV export of all referrals */
  @Get('export')
  async export(@Res() res: Response) {
    const { data } = await this.service.adminList({ limit: 10000 });
    const header = ['Referral ID', 'Referrer Dealer', 'Referral Code', 'Referred User', 'Referred Email', 'Status', 'Created At', 'Qualified At'];
    const rows = data.map((r: any) => [
      r.id,
      r.referrerDealer?.nameEn ?? '',
      r.referralCodeUsed,
      r.referredUser?.name ?? '',
      r.referredUser?.email ?? '',
      r.status,
      r.createdAt?.toISOString?.() ?? '',
      r.qualifiedAt?.toISOString?.() ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="referrals-export.csv"');
    res.send(csv);
  }

  /** PATCH /admin/referrals/:id/approve — un-reject/un-suspend and re-evaluate */
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.adminApprove(id);
  }

  /** PATCH /admin/referrals/:id/reject */
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectReferralDto) {
    return this.service.adminReject(id, dto.reason);
  }

  /** PATCH /admin/referrals/:id/suspend — pauses an already-qualified referral */
  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.service.adminSuspend(id);
  }
}
