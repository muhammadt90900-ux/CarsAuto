// apps/api/src/modules/referrals/dto/referral.dto.ts

import { IsIn, IsOptional, IsString, MaxLength, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminReferralQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'QUALIFIED', 'REJECTED', 'SUSPENDED'] })
  @IsOptional()
  @IsIn(['PENDING', 'QUALIFIED', 'REJECTED', 'SUSPENDED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by referrer dealer name, referred user name/email, or referral code' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class RejectReferralDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
