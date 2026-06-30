// apps/api/src/modules/dealers/dto/create-dealer.dto.ts

import {
  IsString, IsOptional, IsEmail, IsUrl, IsNumber,
  IsArray, IsPhoneNumber, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDealerDto {
  @ApiProperty({ description: 'Dealer name (English)', minLength: 2, maxLength: 80 })
  @IsString() @MinLength(2) @MaxLength(80)  nameEn!: string;

  @ApiProperty({ description: 'Dealer name (Arabic)', minLength: 2, maxLength: 80 })
  @IsString() @MinLength(2) @MaxLength(80)  nameAr!: string;

  @ApiProperty({ description: 'Dealer name (Kurdish)', minLength: 2, maxLength: 80 })
  @IsString() @MinLength(2) @MaxLength(80)  nameKu!: string;

  @ApiPropertyOptional({ description: 'Tagline (English)', maxLength: 160 })
  @IsOptional() @IsString() @MaxLength(160) taglineEn?: string;
  @ApiPropertyOptional({ description: 'Tagline (Arabic)', maxLength: 160 })
  @IsOptional() @IsString() @MaxLength(160) taglineAr?: string;
  @ApiPropertyOptional({ description: 'Tagline (Kurdish)', maxLength: 160 })
  @IsOptional() @IsString() @MaxLength(160) taglineKu?: string;

  @ApiPropertyOptional({ description: 'Description (English)', maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @ApiPropertyOptional({ description: 'Description (Arabic)', maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000) descriptionAr?: string;
  @ApiPropertyOptional({ description: 'Description (Kurdish)', maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000) descriptionKu?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+9647501234567' })
  @IsOptional() @IsString()  phone?: string;
  @ApiPropertyOptional({ description: 'WhatsApp number', example: '+9647501234567' })
  @IsOptional() @IsString()  whatsapp?: string;
  @ApiPropertyOptional({ description: 'Email address', example: 'dealer@example.com' })
  @IsOptional() @IsEmail()   email?: string;
  @ApiPropertyOptional({ description: 'Website URL', example: 'https://example.com' })
  @IsOptional() @IsUrl()     website?: string;
  @ApiPropertyOptional({ description: 'Instagram handle/URL' })
  @IsOptional() @IsString()  instagram?: string;
  @ApiPropertyOptional({ description: 'Facebook page handle/URL' })
  @IsOptional() @IsString()  facebook?: string;
  @ApiPropertyOptional({ description: 'Telegram handle/URL' })
  @IsOptional() @IsString()  telegram?: string;

  @ApiPropertyOptional({ description: 'Location id', format: 'uuid' })
  @IsOptional() @IsString()  locationId?: string;
  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional() @IsString()  address?: string;
  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional() @IsNumber()  lat?: number;
  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional() @IsNumber()  lng?: number;

  @ApiPropertyOptional({ description: 'Opening hours by day, e.g. { "mon": "9:00-18:00" }' })
  @IsOptional()              openingHours?: Record<string, string>;
  @ApiPropertyOptional({ description: 'Specialties/tags', type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
}
