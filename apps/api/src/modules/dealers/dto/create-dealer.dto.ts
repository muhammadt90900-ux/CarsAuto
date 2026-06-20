// apps/api/src/modules/dealers/dto/create-dealer.dto.ts

import {
  IsString, IsOptional, IsEmail, IsUrl, IsNumber,
  IsArray, IsPhoneNumber, MaxLength, MinLength,
} from 'class-validator';

export class CreateDealerDto {
  @IsString() @MinLength(2) @MaxLength(80)  nameEn!: string;
  @IsString() @MinLength(2) @MaxLength(80)  nameAr!: string;
  @IsString() @MinLength(2) @MaxLength(80)  nameKu!: string;

  @IsOptional() @IsString() @MaxLength(160) taglineEn?: string;
  @IsOptional() @IsString() @MaxLength(160) taglineAr?: string;
  @IsOptional() @IsString() @MaxLength(160) taglineKu?: string;

  @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionAr?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionKu?: string;

  @IsOptional() @IsString()  phone?: string;
  @IsOptional() @IsString()  whatsapp?: string;
  @IsOptional() @IsEmail()   email?: string;
  @IsOptional() @IsUrl()     website?: string;
  @IsOptional() @IsString()  instagram?: string;
  @IsOptional() @IsString()  facebook?: string;
  @IsOptional() @IsString()  telegram?: string;

  @IsOptional() @IsString()  locationId?: string;
  @IsOptional() @IsString()  address?: string;
  @IsOptional() @IsNumber()  lat?: number;
  @IsOptional() @IsNumber()  lng?: number;

  @IsOptional()              openingHours?: Record<string, string>;
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
}
