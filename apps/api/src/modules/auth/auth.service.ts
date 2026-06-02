// apps/api/src/modules/auth/auth.service.ts
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const BCRYPT_ROUNDS               = 12;
const MAX_FAILED_ATTEMPTS         = 5;
const LOCK_DURATION_MS            = 15 * 60 * 1_000;      // 15 min
const REFRESH_TOKEN_BYTES         = 64;
const VERIFICATION_TOKEN_BYTES    = 32;
const VERIFICATION_EXPIRES_HOURS  = 24;
const RESET_TOKEN_BYTES           = 32;
const RESET_EXPIRES_MINUTES       = 30;                    // 30-minute window
const MAX_ACTIVE_REFRESH_TOKENS   = 5;

// Roles that public registration is allowed to set (ADMIN excluded)
const ALLOWED_SELF_ASSIGN_ROLES = new Set(['USER', 'DEALER']);

// ── Audit action constants ────────────────────────────────────────────────────
export const AuditAction = {
  REGISTER:                'REGISTER',
  LOGIN_SUCCESS:           'LOGIN_SUCCESS',
  LOGIN_FAILURE:           'LOGIN_FAILURE',
  ACCOUNT_LOCKED:          'ACCOUNT_LOCKED',
  LOGOUT:                  'LOGOUT',
  PASSWORD_RESET_REQUEST:  'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS:  'PASSWORD_RESET_SUCCESS',
  PASSWORD_RESET_FAILURE:  'PASSWORD_RESET_FAILURE',
  EMAIL_VERIFIED:          'EMAIL_VERIFIED',
  VERIFICATION_RESENT:     'VERIFICATION_RESENT',
  TOKEN_REFRESH:           'TOKEN_REFRESH',
  TOKEN_REUSE_DETECTED:    'TOKEN_REUSE_DETECTED',
} as const;

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, ctx?: RequestContext) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'ئەم ئیمەیڵە پێشتر تۆمار کراوە / Email already registered',
      );
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const safeRole =
      dto.role && ALLOWED_SELF_ASSIGN_ROLES.has(dto.role) ? dto.role : 'USER';

    const user = await this.prisma.user.create({
      data: {
        name:     dto.name,
        email:    dto.email.toLowerCase(),
        password: hash,
        ...(dto.phone ? { phone: dto.phone } : {}),
        role:     safeRole as any,
        verified: false,
      },
      select: {
        id: true, name: true, email: true, phone: true, role: true, verified: true,
      },
    });

    await this.audit(user.id, AuditAction.REGISTER, ctx);
    this.logger.log(`New user registered: ${user.id}`);

    this.sendVerificationEmailForUser(user.id, user.email, user.name).catch((err) =>
      this.logger.error(`Verification email failed for ${user.id}: ${err?.message}`),
    );

    return this.issueTokenPair(user);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ctx?: RequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true, name: true, email: true, phone: true, role: true, verified: true,
        password: true, failedLoginAttempts: true, lockedUntil: true,
      },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      await this.audit(user.id, AuditAction.LOGIN_FAILURE, ctx, {
        reason: 'account_locked',
      });
      throw new ForbiddenException(
        `ئەکاونتەکەت کلاو کراوەتەوە. ${minutesLeft} خولەک دوا دوبارە هەوڵ بدەوە / ` +
          `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const validPassword =
      user?.password && (await bcrypt.compare(dto.password, user.password));

    if (!user || !validPassword) {
      if (user) {
        await this.recordFailedLogin(user.id, user.failedLoginAttempts, ctx);
      } else {
        // Blind audit for non-existent user — no userId
        await this.audit(null, AuditAction.LOGIN_FAILURE, ctx, {
          email: dto.email.toLowerCase(),
          reason: 'user_not_found',
        });
      }
      throw new UnauthorizedException(
        'ئیمەیڵ یان پاسوۆرد هەڵەیە / Invalid email or password',
      );
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    await this.audit(user.id, AuditAction.LOGIN_SUCCESS, ctx);
    this.logger.log(`User logged in: ${user.id}`);

    const { password: _pw, failedLoginAttempts: _fa, lockedUntil: _lu, ...safeUser } = user;
    return this.issueTokenPair(safeUser);
  }

  // ── Forgot Password ───────────────────────────────────────────────────────

  /**
   * Step 1 of password reset: issue a signed reset token and email it.
   *
   * Security design:
   *  - Always returns a generic success message — never reveals whether the
   *    email is registered (prevents account enumeration).
   *  - Token is a 32-byte CSPRNG value stored as SHA-256 hash only.
   *  - Existing unused tokens for this user are invalidated on each request
   *    (one active token at a time).
   *  - Expires in RESET_EXPIRES_MINUTES (default 30 min).
   */
  async forgotPassword(dto: ForgotPasswordDto, ctx?: RequestContext): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'ئەگەر ئەم ئیمەیڵە تۆمارکراو بێت، لینکی گۆڕینی پاسوۆرد دەنێردرێت. / ' +
        'If that email is registered, a reset link has been sent.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, name: true, email: true, banned: true, deletedAt: true },
    });

    // Log the attempt regardless of outcome
    await this.audit(user?.id ?? null, AuditAction.PASSWORD_RESET_REQUEST, ctx, {
      email: dto.email.toLowerCase(),
      found: !!user,
    });

    // Return generic response for non-existent / banned / deleted accounts
    if (!user || user.banned || user.deletedAt) {
      return genericResponse;
    }

    try {
      await this.issuePasswordResetToken(user.id, user.email, user.name, ctx);
    } catch (err: any) {
      this.logger.error(`Failed to issue reset token for ${user.id}: ${err?.message}`);
      // Still return generic — internal errors must not be surfaced
    }

    return genericResponse;
  }

  /**
   * Step 2 of password reset: validate token and set the new password.
   *
   * Security design:
   *  - Constant-time token comparison (hash comparison is already safe).
   *  - Token consumed (usedAt set) atomically with password update.
   *  - All refresh tokens revoked to force re-login on all devices.
   *  - passwordChangedAt updated — can be used by JWT strategy to invalidate
   *    tokens issued before the password change.
   */
  async resetPassword(dto: ResetPasswordDto, ctx?: RequestContext): Promise<{ message: string }> {
    if (!dto.token || dto.token.length < 16) {
      throw new BadRequestException('تۆکنەکە نادروستە / Invalid reset token');
    }

    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, name: true, banned: true, deletedAt: true },
        },
      },
    });

    // Generic error covers: not found, already used, expired, banned
    const invalid = () =>
      new BadRequestException(
        'تۆکنی گۆڕینی پاسوۆرد نادروست یان بەسەرچووە. تکایە دوبارە داوا بکە. / ' +
        'Password reset token is invalid or expired. Please request a new one.',
      );

    if (!record) {
      await this.audit(null, AuditAction.PASSWORD_RESET_FAILURE, ctx, {
        reason: 'token_not_found',
      });
      throw invalid();
    }

    if (record.usedAt) {
      await this.audit(record.userId, AuditAction.PASSWORD_RESET_FAILURE, ctx, {
        reason: 'token_already_used',
      });
      throw invalid();
    }

    if (record.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({ where: { id: record.id } });
      await this.audit(record.userId, AuditAction.PASSWORD_RESET_FAILURE, ctx, {
        reason: 'token_expired',
      });
      throw invalid();
    }

    if (record.user.banned || record.user.deletedAt) {
      await this.audit(record.userId, AuditAction.PASSWORD_RESET_FAILURE, ctx, {
        reason: 'account_inactive',
      });
      throw invalid();
    }

    const newHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    const now = new Date();

    // Atomic: mark token used + update password + revoke all refresh tokens
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data:  { usedAt: now },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          password:             newHash,
          passwordChangedAt:    now,
          failedLoginAttempts:  0,
          lockedUntil:          null,
        },
      }),
      // Revoke all active sessions — force re-login everywhere
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    await this.audit(record.userId, AuditAction.PASSWORD_RESET_SUCCESS, ctx);
    this.logger.log(`Password reset successful for user: ${record.userId}`);

    return {
      message:
        'پاسوۆردەکەت بە سەرکەوتوویی گۆڕدرا. تکایە دوبارە بچە ژوورەوە. / ' +
        'Password reset successfully. Please log in with your new password.',
    };
  }

  // ── Email verification ────────────────────────────────────────────────────

  async verifyEmail(rawToken: string): Promise<{ message: string; verified: boolean }> {
    if (!rawToken) {
      throw new BadRequestException('Verification token is required');
    }

    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, verified: true, email: true } },
      },
    });

    if (!record) {
      throw new BadRequestException(
        'تۆکنی پشتڕاستکردنەوە نادروست یان بەسەرچووە / Invalid or expired verification token',
      );
    }

    if (record.expiresAt < new Date()) {
      await this.prisma.emailVerificationToken.delete({ where: { id: record.id } });
      throw new BadRequestException(
        'تۆکنی پشتڕاستکردنەوە بەسەرچووە. تکایە دوبارە بنێرە / ' +
          'Verification token has expired. Please request a new one.',
      );
    }

    if (record.user.verified) {
      await this.prisma.emailVerificationToken.delete({ where: { id: record.id } });
      return { message: 'Email already verified', verified: true };
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data:  { verified: true },
      }),
      this.prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    await this.audit(record.userId, AuditAction.EMAIL_VERIFIED);
    this.logger.log(`Email verified for user: ${record.userId}`);

    return {
      message: 'ئیمەیڵەکەت بە سەرکەوتوویی پشتڕاست کرا / Email verified successfully',
      verified: true,
    };
  }

  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, verified: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.verified) {
      return {
        message: 'ئیمەیڵەکەت پێشتر پشتڕاست کراوە / Email is already verified',
      };
    }

    await this.sendVerificationEmailForUser(user.id, user.email, user.name);
    await this.audit(userId, AuditAction.VERIFICATION_RESENT);

    return {
      message:
        'ئیمەیڵی پشتڕاستکردنەوە دووبارە نێردرا / Verification email resent. Please check your inbox.',
    };
  }

  // ── Refresh / revoke ──────────────────────────────────────────────────────

  async refreshTokens(rawToken: string | undefined, ctx?: RequestContext) {
    if (!rawToken) throw new UnauthorizedException('Refresh token missing');

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true,
            role: true, verified: true, lockedUntil: true,
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });
        await this.audit(stored.userId, AuditAction.TOKEN_REUSE_DETECTED, ctx);
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.user.lockedUntil && stored.user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is locked');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    await this.audit(stored.userId, AuditAction.TOKEN_REFRESH, ctx);
    return this.issueTokenPair(stored.user);
  }

  async revokeRefreshToken(rawToken: string, userId?: string, ctx?: RequestContext) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    if (userId) await this.audit(userId, AuditAction.LOGOUT, ctx);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Issues a password-reset token, stores its hash, and sends the email.
   * Any previous unused tokens for this user are deleted first.
   */
  private async issuePasswordResetToken(
    userId: string,
    email: string,
    name: string,
    ctx?: RequestContext,
  ): Promise<void> {
    const rawToken  = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60_000);

    // Invalidate all previous reset tokens for this user
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt },
      }),
    ]);

    const appUrl   = this.cfg.get<string>('APP_URL', 'https://carsauto.app');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordResetEmail({
      to:               email,
      userName:         name,
      resetUrl,
      expiresInMinutes: RESET_EXPIRES_MINUTES,
      ipAddress:        ctx?.ipAddress,
    });

    this.logger.log(`Password reset email sent to user ${userId}`);
  }

  private async sendVerificationEmailForUser(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    const rawToken  = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRES_HOURS * 3_600_000);

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationToken.create({
        data: { userId, tokenHash, expiresAt },
      }),
    ]);

    const appUrl          = this.cfg.get<string>('APP_URL', 'https://carsauto.app');
    const verificationUrl = `${appUrl}/verify-email?token=${rawToken}`;

    await this.emailService.sendVerificationEmail({
      to:              email,
      userName:        name,
      verificationUrl,
      expiresInHours:  VERIFICATION_EXPIRES_HOURS,
    });

    this.logger.log(`Verification email sent to user ${userId}`);
  }

  private async issueTokenPair(user: {
    id: string; name: string; email: string;
    phone?: string | null; role: string; verified: boolean;
  }) {
    const payload       = { sub: user.id, email: user.email, role: user.role };
    const access_token  = this.jwt.sign(payload);

    const rawRefresh = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash  = this.hashToken(rawRefresh);
    const expiresAt  = new Date(
      Date.now() + this.parseDuration(this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')),
    );

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    await this.pruneOldRefreshTokens(user.id);

    return {
      access_token,
      refresh_token: rawRefresh,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        phone:    user.phone ?? null,
        role:     user.role,
        verified: user.verified,
      },
    };
  }

  private async recordFailedLogin(
    userId: string,
    currentAttempts: number,
    ctx?: RequestContext,
  ) {
    const newCount   = currentAttempts + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newCount,
        ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) } : {}),
      },
    });
    await this.audit(userId, AuditAction.LOGIN_FAILURE, ctx, {
      attempts: newCount,
      locked: shouldLock,
    });
    if (shouldLock) {
      await this.audit(userId, AuditAction.ACCOUNT_LOCKED, ctx);
      this.logger.warn(`Account locked due to failed attempts: ${userId}`);
    }
  }

  /**
   * Append-only audit log entry. Fire-and-forget — never blocks the caller.
   */
  private async audit(
    userId: string | null,
    action: string,
    ctx?: RequestContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          ...(userId ? { userId } : {}),
          action,
          ipAddress: ctx?.ipAddress ?? null,
          userAgent: ctx?.userAgent ?? null,
          meta:      meta ?? null,
        },
      });
    } catch (err: any) {
      // Audit failure must never break the main flow
      this.logger.error(`Audit log write failed [${action}]: ${err?.message}`);
    }
  }

  private async pruneOldRefreshTokens(userId: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select:  { id: true },
    });
    if (tokens.length > MAX_ACTIVE_REFRESH_TOKENS) {
      const idsToDelete = tokens.slice(MAX_ACTIVE_REFRESH_TOKENS).map((t) => t.id);
      await this.prisma.refreshToken.deleteMany({ where: { id: { in: idsToDelete } } });
    }
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private parseDuration(str: string): number {
    const units: Record<string, number> = {
      s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000,
    };
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 86_400_000;
    return parseInt(match[1], 10) * (units[match[2]] ?? 86_400_000);
  }
}
