// apps/api/src/modules/reports/dto/create-report.dto.ts
//
// Trust & Safety Prompt 7, part 3. Whitelist matches (and is the single
// source of truth for) admin.service.ts's getReports() filter whitelist —
// see reports.service.ts's header for why REVIEW is being added to BOTH
// in this prompt, and why there was no submission endpoint to attach this
// DTO to before now.

import { IsIn, IsUUID, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const REPORT_TARGET_TYPES = ['LISTING', 'USER', 'DEALER', 'MESSAGE', 'REVIEW'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export class CreateReportDto {
  @ApiProperty({ enum: REPORT_TARGET_TYPES })
  @IsIn(REPORT_TARGET_TYPES, {
    message: 'جۆری ئامانج دروست نییە / Invalid target type. Must be one of: ' + REPORT_TARGET_TYPES.join(', '),
  })
  targetType!: ReportTargetType;

  @ApiProperty()
  @IsUUID()
  targetId!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(3, { message: 'هۆکار پێویستە / A reason is required' })
  @MaxLength(255, { message: 'هۆکارەکە زۆر درێژە / Reason is too long (max 255 characters)' })
  reason!: string;
}
