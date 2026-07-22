// apps/api/src/modules/referrals/referrals.controller.ts

import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@ApiBearerAuth('bearer')
@Controller('referrals')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  /** GET /referrals/me — Seller Dashboard referral summary (code, counts,
   * progress to next reward, history, badges). */
  @Get('me')
  getMyDashboard(@Request() req: any) {
    return this.service.getDashboard(req.user.userId);
  }
}
