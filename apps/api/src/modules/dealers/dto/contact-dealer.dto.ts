// apps/api/src/modules/dealers/dto/contact-dealer.dto.ts

import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum ContactChannel {
  FORM     = 'form',
  WHATSAPP = 'whatsapp',
  PHONE    = 'phone',
}

export class ContactDealerDto {
  @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsString() @MinLength(5) @MaxLength(1000)
  message!: string;

  @IsOptional() @IsEnum(ContactChannel)
  channel?: ContactChannel;

  @IsOptional() @IsString()
  listingId?: string;
}
