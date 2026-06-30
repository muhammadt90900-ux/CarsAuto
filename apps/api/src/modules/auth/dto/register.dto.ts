// apps/api/src/modules/auth/dto/register.dto.ts
import {
  IsEmail, IsString, MinLength, MaxLength,
  IsOptional, IsIn, Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
const PASSWORD_MSG =
  'پاسوۆردەکە دەبێت لانیکەم ٨ پیت بێت و لێکدانەوەی پیتی گەورە، بچووک و ژمارە تێدا بێت / ' +
  'Password must be at least 8 characters and contain uppercase, lowercase, and a number';

const PHONE_REGEX = /^[+\d\s\-()\u0660-\u0669]{7,20}$/;

// FIX: ADMIN is not in the allowed set — prevents privilege escalation via registration
const ALLOWED_ROLES = ['USER', 'BUYER', 'DEALER'] as const;

export class RegisterDto {
  @ApiProperty({ description: "User's full display name", example: 'Ahmed Karim', minLength: 2, maxLength: 80 })
  @IsString()
  @MinLength(2, { message: 'ناو دەبێت لانیکەم ٢ پیت بێت / Name must be at least 2 characters' })
  @MaxLength(80, { message: 'ناو زۆر درێژە / Name is too long' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @ApiProperty({ description: 'Email address (normalised to lowercase)', example: 'ahmed@example.com' })
  @IsEmail({}, { message: 'ئیمەیڵی دروست بنووسە / Please enter a valid email address' })
  @MaxLength(254)
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email!: string;

  @ApiProperty({
    description: 'Password — minimum 8 characters, must contain uppercase, lowercase, and a digit',
    example: 'StrongPass1',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: PASSWORD_MSG })
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password!: string;

  @ApiPropertyOptional({ description: 'Phone number (optional)', example: '+9647501234567' })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'ژمارەی تەلەفۆن دروست نییە / Invalid phone number' })
  @MaxLength(20)
  @Transform(({ value }) => value?.trim() || undefined)
  phone?: string;

  @ApiPropertyOptional({
    description: "Requested account role. 'BUYER' is normalised to 'USER'. ADMIN can never be self-assigned.",
    enum: ['USER', 'BUYER', 'DEALER'],
    example: 'USER',
  })
  @IsOptional()
  @IsIn(ALLOWED_ROLES, { message: 'Invalid role' })
  @Transform(({ value }) => {
    if (value === 'BUYER') return 'USER';
    if (value === 'DEALER') return 'DEALER';
    return 'USER';
  })
  role?: 'USER' | 'DEALER';
}
