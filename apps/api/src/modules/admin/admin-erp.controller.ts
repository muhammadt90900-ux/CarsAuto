// apps/api/src/modules/admin/admin-erp.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminErpService } from './admin-erp.service';

@ApiTags('Admin — ERP Analytics')
@ApiBearerAuth('bearer')
@Controller('admin/erp')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminErpController {
  constructor(private readonly adminErp: AdminErpService) {}

  @Get('overview')
  getOverview() {
    return this.adminErp.getOverview();
  }

  @Get('dealer-activity')
  getDealerActivity(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminErp.getDealerActivity(page ? Number(page) : 1, limit ? Number(limit) : 20);
  }
}
