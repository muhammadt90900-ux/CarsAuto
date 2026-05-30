// apps/api/src/modules/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
const PASSWORD_MSG =
  'پاسوۆردەکە دەبێت لانیکەم ٨ پیت بێت و لێکدانەوەی پیتی گەورە، بچووک و ژمارە تێدا بێت / ' +
  'Password must be at least 8 characters and contain uppercase, lowercase, and a number';

const PHONE_REGEX = /^[+\d\s\-()\u0660-\u0669]{7,20}$/;

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'ناو دەبێت لانیکەم ٢ پیت بێت / Name must be at least 2 characters' })
  @MaxLength(80, { message: 'ناو زۆر درێژە / Name is too long' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail({}, { message: 'ئیمەیڵی دروست بنووسە / Please enter a valid email address' })
  @MaxLength(254)
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email: string;

  @IsString()
  @MinLength(8, { message: PASSWORD_MSG })
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: 'ژمارەی تەلەفۆن دروست نییە / Invalid phone number' })
  @MaxLength(20)
  @Transform(({ value }) => value?.trim() || undefined)
  phone?: string;

  // BUYER is default; DEALER requires additional verification later
  @IsOptional()
  @IsIn(['USER', 'BUYER', 'DEALER'])
  @Transform(({ value }) => {
    // Map front-end role names to prisma enum
    if (value === 'BUYER') return 'USER';
    if (value === 'DEALER') return 'DEALER';
    return 'USER';
  })
  role?: 'USER' | 'DEALER';
}
