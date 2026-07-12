/**
 * apps/api/src/modules/reports/reports.service.ts
 *
 * Trust & Safety Prompt 7, part 3.
 *
 * ⚠️ SCOPE NOTE, same shape as reviews.service.ts's: "extend the existing
 * Report flow ... to properly support targetType='REVIEW' end to end"
 * assumed a report-SUBMISSION endpoint already existed and just needed a
 * REVIEW branch. Grepped the whole apps/api tree: admin.service.ts fully
 * implements the ADMIN side (getReports() queue, resolveReport()) and
 * fraud-scoring.service.ts reads report counts, but nothing anywhere
 * creates a Report row — no controller, no service method, confirmed by
 * grepping for `report.create` / `CreateReportDto` and finding zero
 * matches before this file. There was no "end" on the submission side to
 * wire REVIEW into. This service is the missing submission path; REVIEW is
 * included in its target-type whitelist from the start, alongside the 4
 * types admin.service.ts's getReports() already filters on
 * (LISTING/USER/DEALER/MESSAGE) — see create-report.dto.ts.
 *
 * CASING: Report.targetType values here are UPPERCASE ('REVIEW', not
 * 'Review') — matching admin.service.ts's existing getReports() whitelist
 * and fraud-scoring.service.ts's scoreUserReports() query ('USER'). This
 * is a DIFFERENT field on a DIFFERENT model than AuditLog.targetType
 * (PascalCase: 'User', 'Listing', 'Report', ...) — see
 * fraud-scoring.service.ts's pre-existing comment on scoreUserReports()
 * for the full explanation of why these two never actually collide despite
 * sharing a field name across models.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    await this.assertTargetExists(dto.targetType, dto.targetId);

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
      },
    });

    this.logger.log(`Report filed: ${dto.targetType} ${dto.targetId} by ${reporterId}`);
    return report;
  }

  /** Prevents garbage targetIds from ever reaching the admin queue as an unresolvable row. */
  private async assertTargetExists(targetType: string, targetId: string): Promise<void> {
    let exists = false;
    switch (targetType) {
      case 'LISTING':
        exists = !!(await this.prisma.listing.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } }));
        break;
      case 'USER':
        exists = !!(await this.prisma.user.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } }));
        break;
      case 'DEALER':
        exists = !!(await this.prisma.dealer.findFirst({ where: { id: targetId }, select: { id: true } }));
        break;
      case 'MESSAGE':
        exists = !!(await this.prisma.message.findFirst({ where: { id: targetId }, select: { id: true } }));
        break;
      case 'REVIEW':
        exists = !!(await this.prisma.review.findFirst({ where: { id: targetId }, select: { id: true } }));
        break;
      default:
        // DTO's @IsIn already blocks this in practice — defensive fallthrough only.
        exists = false;
    }
    if (!exists) {
      throw new NotFoundException(`${targetType} ${targetId} not found`);
    }
  }
}
