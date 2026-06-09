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

const THROTTLE_RESET_REQUEST = { default: { ttl: 15 * 60_000, limit: 5 } };
const THROTTLE_RESET_CONFIRM = { default: { ttl: 15 * 60_000, limit: 10 } };
const THROTTLE_LOGIN         = { default: { ttl: 60_000, limit: 10 } };
const THROTTLE_REGISTER      = { default: { ttl: 60_000, limit: 5 } };
const THROTTLE_VERIFY_EMAIL  = { default: { ttl: 60_000, limit: 10 } };
const THROTTLE_RESEND        = { default: { ttl: 60_000, limit: 3 } };

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
    if (!token) throw new UnauthorizedException('No refresh token');
    const result = await this.authService.refreshToken(token, undefined, this.ctx(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { access_token: result.accessToken };
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  // FIX: No JwtAuthGuard — logout must always succeed even with an expired/missing token.
  // FIX: try/catch around revokeRefreshToken so a DB error never returns 500 to the client.

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined = req.cookies?.['refresh_token'];
    if (token) {
      try {
        await this.authService.revokeRefreshToken(token, undefined, this.ctx(req));
      } catch (err) {
        // Non-fatal: token may already be expired or deleted.
        // Log the warning but always clear the cookie and return 204.
        this.logger.warn(`Logout revoke failed (non-fatal): ${(err as Error).message}`);
      }
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
  @Throttle(THROTTLE_VERIFY_EMAIL)
  async verifyEmail(
    @Query('token') token: string,
    @Req() req: Request,
  ) {
    if (!token || typeof token !== 'string' || token.length < 16) {
      throw new BadRequestException('Missing or malformed verification token');
    }

    const ip = this.ctx(req).ipAddress ?? 'unknown';
    this.otpProtection.checkAttempt(`email-verify:${ip}`);

    try {
      const result = await this.authService.verifyEmail(token);
      this.otpProtection.clearAttempts(`email-verify:${ip}`);
      return result;
    } catch (err) {
      this.otpProtection.recordFailure(`email-verify:${ip}`);
      throw err;
    }
  }

  // ── Resend Verification Email ─────────────────────────────────────────────

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE_RESEND)
  async resendVerification(@Req() req: Request) {
    const user = (req as any).user as { userId: string };
    const ip   = this.ctx(req).ipAddress;

    this.otpProtection.checkSendRate(user.userId, ip);
    const result = await this.authService.resendVerificationEmail(user.userId);
    this.otpProtection.recordSend(user.userId, ip);

    return result;
  }

  // ── Forgot Password ───────────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_RESET_REQUEST)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ip = this.ctx(req).ipAddress;

    this.otpProtection.checkSendRate(`forgot:${dto.email}`, ip);
    const result = await this.authService.forgotPassword(dto, this.ctx(req));
    this.otpProtection.recordSend(`forgot:${dto.email}`, ip);

    return result;
  }

  // ── Reset Password ────────────────────────────────────────────────────────

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(THROTTLE_RESET_CONFIRM)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ip = this.ctx(req).ipAddress ?? 'unknown';

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
      sameSite: 'lax' as const,
      path:     '/',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, this.cookieOptions());
  }
}