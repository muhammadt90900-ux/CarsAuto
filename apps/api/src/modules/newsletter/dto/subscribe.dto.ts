// apps/api/src/modules/newsletter/dto/subscribe.dto.ts
import { IsEmail, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SUPPORTED_LOCALES = ['ku', 'ar', 'en', 'zh'];

export class SubscribeNewsletterDto {
  @ApiProperty({ description: 'Email address to subscribe', example: 'ahmed@example.com' })
  @IsEmail({}, { message: 'ئیمەیڵێکی دروست بنووسە / Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase?.().trim())
  email!: string;

  @ApiPropertyOptional({ description: 'Locale the visitor was browsing in when they subscribed', example: 'ku' })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}
