// apps/api/src/modules/auth/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  // ── Register ─────────────────────────────────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refresh_token);
    return { access_token: result.access_token, user: result.user };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refresh_token);
    return { access_token: result.access_token, user: result.user };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined = req.cookies?.['refresh_token'];
    const result = await this.authService.refreshTokens(token);
    this.setRefreshCookie(res, result.refresh_token);
    return { access_token: result.access_token };
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined = req.cookies?.['refresh_token'];
    if (token) await this.authService.revokeRefreshToken(token);
    res.clearCookie('refresh_token', this.cookieOptions());
  }

  // ── Me ────────────────────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return (req as any).user;
  }

  // ── Verify Email ──────────────────────────────────────────────────────────
  /**
   * GET /auth/verify-email?token=<raw_token>
   *
   * Called when the user clicks the link in their verification email.
   * Public endpoint — no authentication required.
   */
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    if (!token || typeof token !== 'string' || token.length < 16) {
      throw new BadRequestException('Missing or malformed verification token');
    }
    return this.authService.verifyEmail(token);
  }

  // ── Resend Verification Email ─────────────────────────────────────────────
  /**
   * POST /auth/resend-verification
   *
   * Authenticated endpoint — re-sends the verification email for the
   * currently logged-in user. Replaces any existing pending token.
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async resendVerification(@Req() req: Request) {
    const user = (req as any).user as { userId: string };
    return this.authService.resendVerificationEmail(user.userId);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, this.cookieOptions());
  }
}
