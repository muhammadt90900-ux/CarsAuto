// apps/api/src/modules/beta/dto/register-beta.dto.ts
import {
  IsString, IsOptional, IsUrl, IsEnum, IsBoolean, IsIn,
  MinLength, MaxLength, Matches, Equals,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingType } from '../../../common/prisma/enums';

// Same phone pattern used by auth/dto/register.dto.ts — accepts +/digits/
// spaces/dashes/parens and Eastern Arabic-Indic digits (٠-٩).
const PHONE_REGEX = /^[+\d\s\-()\u0660-\u0669]{7,20}$/;

const SUPPORTED_LOCALES = ['ku', 'ar', 'en', 'zh'];

export class RegisterBetaDto {
  @ApiProperty({ description: 'Dealer / business name', minLength: 2, maxLength: 150 })
  @IsString() @MinLength(2) @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  dealerName!: string;

  @ApiProperty({ description: 'Owner full name', minLength: 2, maxLength: 150 })
  @IsString() @MinLength(2) @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  ownerName!: string;

  @ApiProperty({ description: 'Contact phone number', example: '+9647501234567' })
  @IsString()
  @Matches(PHONE_REGEX, { message: 'ژمارەی تەلەفۆن دروست نییە / Invalid phone number' })
  @MaxLength(30)
  @Transform(({ value }) => value?.trim())
  phone!: string;

  @ApiProperty({ description: 'City', maxLength: 100 })
  @IsString() @MinLength(2) @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  city!: string;

  @ApiProperty({
    description: 'Primary business type',
    enum: ListingType,
    example: 'CAR',
  })
  @IsEnum(ListingType, { message: 'Invalid business type' })
  businessType!: ListingType;

  @ApiPropertyOptional({ description: 'Facebook page URL' })
  @IsOptional() @IsUrl({}, { message: 'Please provide a valid URL' }) @MaxLength(255)
  facebookUrl?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional() @IsUrl({}, { message: 'Please provide a valid URL' }) @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ description: 'Additional notes', maxLength: 1000 })
  @IsOptional() @IsString() @MaxLength(1000)
  @Transform(({ value }) => value?.trim() || undefined)
  notes?: string;

  @ApiPropertyOptional({ description: 'Referral code of the dealer who invited this registrant' })
  @IsOptional() @IsString() @MaxLength(20)
  @Transform(({ value }) => value?.trim()?.toUpperCase() || undefined)
  referralCode?: string;

  @ApiProperty({
    description: 'Must be true — confirms the registrant understands CarsAuto is currently in Beta',
  })
  @IsBoolean()
  @Equals(true, { message: 'You must confirm you understand CarsAuto is currently in Beta' })
  betaAcknowledged!: boolean;

  @ApiPropertyOptional({ description: 'Locale the visitor was browsing in', example: 'ku' })
  @IsOptional() @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}
