// apps/api/src/modules/dealers/dto/contact-dealer.dto.ts

import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContactChannel {
  FORM     = 'form',
  WHATSAPP = 'whatsapp',
  PHONE    = 'phone',
}

export class ContactDealerDto {
  @ApiProperty({ description: 'Your name', example: 'Ahmed Karim', minLength: 2, maxLength: 80 })
  @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ description: 'Your phone number', example: '+9647501234567' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Your email address', example: 'ahmed@example.com' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Message to the dealer', minLength: 5, maxLength: 1000 })
  @IsString() @MinLength(5) @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({ description: 'How this contact request was made', enum: ContactChannel })
  @IsOptional() @IsEnum(ContactChannel)
  channel?: ContactChannel;

  @ApiPropertyOptional({ description: 'Listing id this enquiry relates to, if any' })
  @IsOptional() @IsString()
  listingId?: string;
}
