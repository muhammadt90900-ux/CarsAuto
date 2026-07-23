// apps/api/src/modules/accounting/dto/create-expense.dto.ts

import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../../common/prisma/enums';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory, { message: 'جۆری خەرجی نادروستە / Invalid expense category' })
  category!: ExpenseCategory;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0.01, { message: 'بڕی خەرجی پێویستە لە سفر زیاتر بێت / Expense amount must be greater than zero' })
  amount!: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Defaults to now if omitted' })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}
