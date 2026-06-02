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
  Logger,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// ── Per-endpoint throttle overrides ──────────────────────────────────────────
// Password-related flows get the tightest limits to deter enumeration/brute force.
// Values: { ttl (ms), limit (requests within ttl) }
const THROTTLE_RESET_REQUEST = { ttl: 15 * 60_000, limit: 5 };  // 5 per 15 min per IP
const THROTTLE_RESET_CONFIRM = { ttl: 15 * 60_000, limit: 10 }; // 10 per 15 min per IP
const THROTTLE_LOGIN         = { ttl: 60_000,       limit: 10 }; // 10 per minute
const THROTTLE_REGISTER      = { ttl: 60_000,       limit: 5  }; // 5 per minute

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  // ── Register ──────────────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(THROTTLE_REGISTER)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, this.ctx(req));
    this.setRefreshCookie(res, result.refresh_token);
    return { access_token: result.access_token, user: result.user };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_LOGIN)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, this.ctx(req));
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
    const result = await this.authService.refreshTokens(token, this.ctx(req));
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
    const user = (req as any).user as { userId: string } | undefined;
    if (token) {
      await this.authService.revokeRefreshToken(token, user?.userId, this.ctx(req));
    }
    res.clearCookie('refresh_token', this.cookieOptions());
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return (req as any).user;
  }

  // ── Verify Email ──────────────────────────────────────────────────────────

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    if (!token || typeof token !== 'string' || token.length < 16) {
      throw new BadRequestException('Missing or malformed verification token');
    }
    return this.authService.verifyEmail(token);
  }

  // ── Resend Verification Email ─────────────────────────────────────────────

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async resendVerification(@Req() req: Request) {
    const user = (req as any).user as { userId: string };
    return this.authService.resendVerificationEmail(user.userId);
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  //
  // POST /auth/forgot-password
  //
  // Public, unauthenticated endpoint.
  // Always returns HTTP 200 with a generic message regardless of whether
  // the email exists — prevents account enumeration.
  //
  // Rate limiting: 5 requests per IP per 15 minutes (stricter than default).

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_RESET_REQUEST)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto, this.ctx(req));
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  //
  // POST /auth/reset-password
  //
  // Public, unauthenticated endpoint.
  // Validates the raw token from the reset link, sets a new hashed password,
  // and revokes all refresh tokens (forces re-login on all devices).
  //
  // Rate limiting: 10 attempts per IP per 15 minutes.

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_RESET_CONFIRM)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto, this.ctx(req));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Extract IP + User-Agent for audit logging. */
  private ctx(req: Request) {
    return {
      ipAddress: (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
        req.socket?.remoteAddress ??
        undefined
      ),
      userAgent: (req.headers['user-agent'] as string | undefined),
    };
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path:     '/api/auth',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, this.cookieOptions());
  }
}
