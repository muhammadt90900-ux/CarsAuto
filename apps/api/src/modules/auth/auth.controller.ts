// apps/api/src/modules/auth/auth.controller.ts
//
// FIXES APPLIED (do not rebuild — architecture preserved):
//
//   FIX-C1  Missing `await` on every OtpProtectionService call.
//           OtpProtectionService.checkAttempt / checkSendRate / recordFailure /
//           recordSend / clearAttempts are ALL async (they await cache.get/set).
//           Without await, the 429 exceptions they throw escape onto unhandled
//           promise rejections that NestJS never sees — the check is silently
//           bypassed and the request proceeds as if no limit exists.
//
//   FIX-C2  logout() passed `undefined` as rawAccessToken to revokeRefreshToken,
//           so the Redis access-token blocklist (BUG #5 in auth.service.ts) was
//           never written. Logged-out access tokens remained valid for the full
//           15-minute JWT window. Fix: extract the Bearer token from Authorization
//           and pass it as the second argument.

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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private readonly otpProtection: OtpProtectionService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account created — returns an access token and the new user' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
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

  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Returns an access token and the authenticated user' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Log out — revokes the current refresh token (and access token, if provided)' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
      // FIX-C2: Extract the raw Bearer token so AuthService can write it to the
      // Redis blocklist. Previously `undefined` was passed here, meaning the
      // BUG #5 fix in auth.service.ts (access-token blocklist) was dead code —
      // logged-out tokens remained usable for their remaining 15-minute lifetime.
      const rawAccessToken = req.headers.authorization?.split(' ')[1];
      await this.authService.revokeRefreshToken(token, rawAccessToken, user?.userId, this.ctx(req));
    }

    res.clearCookie('refresh_token', this.cookieOptions());
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'The authenticated user (from the JWT payload)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

    // FIX-C1: checkAttempt is async — must be awaited so that the 429 it throws
    // propagates inside this request handler instead of on an unhandled promise.
    await this.otpProtection.checkAttempt(`email-verify:${ip}`);

    try {
      const result = await this.authService.verifyEmail(token);
      // FIX-C1: clearAttempts is async — await so it actually runs before we return.
      await this.otpProtection.clearAttempts(`email-verify:${ip}`);
      return result;
    } catch (err) {
      // FIX-C1: recordFailure is async — await so the counter is incremented
      // before the exception propagates (otherwise the next call re-reads stale
      // state and the brute-force window never closes).
      await this.otpProtection.recordFailure(`email-verify:${ip}`);
      throw err;
    }
  }

  // ── Resend Verification Email ─────────────────────────────────────────────

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Resend the email verification link to the logged-in user' })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE_RESEND)
  async resendVerification(@Req() req: Request) {
    const user = (req as any).user as { userId: string };
    const ip   = this.ctx(req).ipAddress;

    // FIX-C1: checkSendRate is async — the 429 it throws must propagate here,
    // not silently into an unhandled rejection.
    await this.otpProtection.checkSendRate(user.userId, ip);
    const result = await this.authService.resendVerificationEmail(user.userId);
    // FIX-C1: recordSend is async — await so the cooldown key is written to
    // Redis before the response is returned and the next request is processed.
    await this.otpProtection.recordSend(user.userId, ip);

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

    // FIX-C1: checkSendRate is async — must be awaited.
    await this.otpProtection.checkSendRate(`forgot:${dto.email}`, ip);
    const result = await this.authService.forgotPassword(dto, this.ctx(req));
    // FIX-C1: recordSend is async — must be awaited.
    await this.otpProtection.recordSend(`forgot:${dto.email}`, ip);

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

    // FIX-C1: checkAttempt is async — must be awaited so the 429 propagates.
    await this.otpProtection.checkAttempt(`reset:${ip}`);

    try {
      const result = await this.authService.resetPassword(dto, this.ctx(req));
      // FIX-C1: clearAttempts is async — must be awaited.
      await this.otpProtection.clearAttempts(`reset:${ip}`);
      return result;
    } catch (err) {
      // FIX-C1: recordFailure is async — must be awaited.
      await this.otpProtection.recordFailure(`reset:${ip}`);
      throw err;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private ctx(req: Request) {
    return {
      ipAddress: (req as any).ip as string | undefined,
      userAgent: req.headers['user-agent'] as string | undefined,
    };
  }

  private cookieOptions() {
    const isCodespaces = !!process.env.CODESPACE_NAME;
    const crossOrigin  = process.env.NODE_ENV === 'production' || isCodespaces;
    return {
      httpOnly: true,
      secure:   crossOrigin,
      sameSite: (crossOrigin ? 'none' : 'lax') as 'none' | 'lax',
      path:     '/',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, this.cookieOptions());
  }
}
