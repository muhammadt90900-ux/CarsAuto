// apps/api/src/modules/reports/reports.controller.ts

import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('Reports')
@ApiBearerAuth('bearer')
@Controller('reports')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Body() dto: CreateReportDto, @Req() req: Request) {
    const reporterId = (req as any).user?.userId ?? (req as any).user?.sub;
    return this.reports.create(reporterId, dto);
  }
}
