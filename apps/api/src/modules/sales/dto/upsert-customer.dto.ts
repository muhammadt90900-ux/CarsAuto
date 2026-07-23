// apps/api/src/modules/sales/dto/upsert-customer.dto.ts

import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertCustomerDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @Length(2, 150, { message: 'ناو پێویستە لە نێوان ٢ و ١٥٠ پیت بێت / Name must be between 2 and 150 characters' })
  name!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'ئیمەیل نادروستە / Invalid email' })
  email?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
