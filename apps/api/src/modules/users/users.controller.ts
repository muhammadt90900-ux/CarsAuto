import {
  Controller, Get, Patch, Param, Body, UseGuards, Request, ParseUUIDPipe,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength, IsUrl, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[+\d\s\-()\u0660-\u0669]{7,20}$/, { message: 'Invalid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  // FIX: Validate avatar as a URL to prevent arbitrary string injection
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_tld: true }, { message: 'Avatar must be a valid HTTPS URL' })
  @MaxLength(2048)
  avatar?: string;

  // FIX 3: bio field — user self-description
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  bio?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // FIX: ParseUUIDPipe added — was accepting arbitrary strings as user IDs
  // FIX: Returns public profile only (no email/phone leakage for unauthenticated callers)
  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findByIdPublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Request() req: any,
    @Body() data: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, data);
  }
}
