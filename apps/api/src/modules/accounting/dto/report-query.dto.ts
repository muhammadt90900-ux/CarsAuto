// apps/api/src/modules/accounting/dto/report-query.dto.ts

import { IsDateString, IsEnum, IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../../common/prisma/enums';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export class ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly' })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  period?: ReportPeriod;

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;
}
