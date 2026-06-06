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
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OtpProtectionService } from '../../common/throttler/otp-protection.service';
import { EmailNotificationProcessor } from '../notifications/email-notification.processor';

// ── Per-endpoint throttle overrides ──────────────────────────────────────────
// Password-related flows get the tightest limits to deter enumeration/brute force.
// Values: { ttl (ms), limit (requests within ttl) }
const THROTTLE_RESET_REQUEST = { default: { ttl: 15 * 60_000, limit: 5 } };  // 5 per 15 min per IP
const THROTTLE_RESET_CONFIRM = { default: { ttl: 15 * 60_000, limit: 10 } }; // 10 per 15 min per IP
const THROTTLE_LOGIN         = { default: { ttl: 60_000, limit: 10 } }; // 10 per minute
const THROTTLE_REGISTER      = { default: { ttl: 60_000, limit: 5 } }; // 5 per minute
const THROTTLE_VERIFY_EMAIL  = { default: { ttl: 60_000, limit: 10 } }; // 10 per minute
const THROTTLE_RESEND        = { default: { ttl: 60_000, limit: 3 } }; // 3 per minute

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private readonly otpProtection: OtpProtectionService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(THROTTLE_REGISTER)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto.email, dto.password, dto.name, this.ctx(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { access_token: result.accessToken, user: result.user };
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
    const result = await this.authService.login(dto.email, dto.password, this.ctx(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { access_token: result.accessToken, user: result.user };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined = req.cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException('No refresh token')
    const result = await this.authService.refreshToken(token, undefined, this.ctx(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { access_token: result.accessToken };
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
  //
  // OTP protection: max 10 verify attempts per minute per IP.
  // Records failures to prevent token enumeration.

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_VERIFY_EMAIL)
  async verifyEmail(
    @Query('token') token: string,
    @Req() req: Request,
  ) {
    if (!token || typeof token !== 'string' || token.length < 16) {
      throw new BadRequestException('Missing or malformed verification token');
    }

    // Check OTP attempt limits (keyed by IP to prevent enumeration)
    const ip = this.ctx(req).ipAddress ?? 'unknown';
    this.otpProtection.checkAttempt(`email-verify:${ip}`);

    try {
      const result = await this.authService.verifyEmail(token);
      // Clear attempt counter on success
      this.otpProtection.clearAttempts(`email-verify:${ip}`);
      return result;
    } catch (err) {
      // Record failed attempt for brute-force protection
      this.otpProtection.recordFailure(`email-verify:${ip}`);
      throw err;
    }
  }

  // ── Resend Verification Email ─────────────────────────────────────────────
  //
  // OTP send rate limiting: max 3 per minute (ThrottlerGuard) + OTP cooldown.

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE_RESEND)
  async resendVerification(@Req() req: Request) {
    const user = (req as any).user as { userId: string };
    const ip   = this.ctx(req).ipAddress;

    // OTP-level cooldown & send rate check (prevents email flooding)
    this.otpProtection.checkSendRate(user.userId, ip);

    const result = await this.authService.resendVerificationEmail(user.userId);

    // Record successful send
    this.otpProtection.recordSend(user.userId, ip);

    return result;
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
    const ip = this.ctx(req).ipAddress;

    // OTP-level send rate check to prevent email flooding
    this.otpProtection.checkSendRate(`forgot:${dto.email}`, ip);

    const result = await this.authService.forgotPassword(dto, this.ctx(req));

    // Record the send (don't await — fire and forget for non-critical path)
    this.otpProtection.recordSend(`forgot:${dto.email}`, ip);

    return result;
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
  // OTP protection: tracks failures by IP to detect token enumeration.

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_RESET_CONFIRM)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ip = this.ctx(req).ipAddress ?? 'unknown';

    // Check attempt limit before processing
    this.otpProtection.checkAttempt(`reset:${ip}`);

    try {
      const result = await this.authService.resetPassword(dto, this.ctx(req));
      this.otpProtection.clearAttempts(`reset:${ip}`);
      return result;
    } catch (err) {
      this.otpProtection.recordFailure(`reset:${ip}`);
      throw err;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Extract IP + User-Agent for audit logging. */
  private ctx(req: Request) {
    return {
      ipAddress: (
        ((req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()) ??
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

