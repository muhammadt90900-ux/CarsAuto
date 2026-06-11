import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import * as crypto from 'crypto';

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export enum AuditAction {
  USER_REGISTER = 'USER_REGISTER',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_RESET_FAILURE = 'PASSWORD_RESET_FAILURE',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
}

const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_EXPIRES_HOURS = 24;
const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRES_MINUTES = 60;
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(email: string, password: string, name: string, ctx?: RequestContext) {
    if (!email || !password || !name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, verified: false },
    });

    await this.sendVerificationEmail(user.id, email, name);
    await this.writeAuditLog(user.id, AuditAction.USER_REGISTER, ctx);

    const tokens = await this.issueTokenPair(user);
    return tokens;
  }

  async login(email: string, password: string, ctx?: RequestContext) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.writeAuditLog(null, 'USER_LOGIN_FAILED', ctx, { reason: 'user_not_found' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, user.password ?? '');
    if (!isValid) {
      await this.writeAuditLog(user.id, 'USER_LOGIN_FAILED', ctx, { reason: 'wrong_password' });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is locked');
    }

    await this.writeAuditLog(user.id, AuditAction.USER_LOGIN, ctx);
    return this.issueTokenPair(user);
  }

  async refreshToken(rawToken: string, userId?: string, ctx?: RequestContext) {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            verified: true,
            lockedUntil: true,
          },
        },
      },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        // Expired token found — revoke all sessions (possible token theft)
        await this.prisma.refreshToken.deleteMany({ where: { userId: storedToken.userId } });
        await this.writeAuditLog(storedToken.userId, AuditAction.TOKEN_REUSE_DETECTED, ctx);
        this.logger.warn(`Refresh token reuse detected for user ${storedToken.userId}`);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.user.lockedUntil && storedToken.user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is locked');
    }

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await this.writeAuditLog(storedToken.userId, AuditAction.TOKEN_REFRESH, ctx);

    return this.issueTokenPair(storedToken.user);
  }

  async revokeRefreshToken(rawToken: string, userId?: string, ctx?: RequestContext): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    if (userId) await this.writeAuditLog(userId, AuditAction.USER_LOGOUT, ctx);
  }

  // ── Private Helpers ───────────────────────────────────────────────────

  private async issuePasswordResetToken(
    userId: string,
    email: string,
    name: string,
    ctx?: RequestContext,
  ): Promise<void> {
    const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60_000);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.create({
        data: { userId, tokenHash, expiresAt },
      }),
    ]);

    const appUrl = this.config.get<string>('APP_URL', 'https://carsauto.app');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordResetEmail({
      to: email,
      userName: name,
      resetUrl,
      expiresInMinutes: RESET_EXPIRES_MINUTES,
      ipAddress: ctx?.ipAddress,
    });

    this.logger.log(`Password reset email sent to user ${userId}`);
  }

  private async sendVerificationEmail(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRES_HOURS * 3_600_000);

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationToken.create({
        data: { userId, tokenHash, expiresAt },
      }),
    ]);

    const appUrl = this.config.get<string>('APP_URL', 'https://carsauto.app');
    const verificationUrl = `${appUrl}/verify-email?token=${rawToken}`;

    await this.emailService.sendVerificationEmail({
      to: email,
      userName: name,
      verificationUrl,
      expiresInHours: VERIFICATION_EXPIRES_HOURS,
    });

    this.logger.log(`Verification email sent to user ${userId}`);
  }

  private async issueTokenPair(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000); // 7 days

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    return crypto.scryptSync(password, 'salt', 64).toString('hex');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const derived = crypto.scryptSync(password, 'salt', 64).toString('hex');
    return derived === hash;
  }

  private async writeAuditLog(
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
          ip: ctx?.ipAddress ?? null,
          userAgent: ctx?.userAgent ?? null,
          // FIX: Cast Record to Prisma's InputJsonValue type for the meta field
          meta: (meta ?? undefined) as any,
        },
      });
    } catch (err: any) {
      this.logger.error(`Audit log write failed [${action}]: ${err?.message}`);
    }
  }

  private parseDuration(str: string): number {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 86_400_000; // default 7 days
    return parseInt(match[1]!, 10) * (DURATION_UNITS[match[2]!] ?? 86_400_000);
  }

  async verifyEmail(token: string) {
  const tokenHash = this.hashToken(token);
  const record = await this.prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new BadRequestException('Invalid or expired verification token');
  }

  await this.prisma.user.update({
    where: { id: record.userId },
    data: { verified: true },
  });

  await this.prisma.emailVerificationToken.delete({ where: { tokenHash } });

  return { message: 'Email verified successfully' };
}

async resendVerificationEmail(userId: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new BadRequestException('User not found');
  if (user.verified) throw new BadRequestException('Email already verified');

  await this.sendVerificationEmail(user.id, user.email, user.name);
  return { message: 'Verification email sent' };
}

async forgotPassword(dto: { email: string }, ctx?: RequestContext): Promise<{ message: string }> {
  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
  
  // هەمیشە هەمان وەڵام دەگەڕێنێت — email enumeration رێدەگرێت
  if (user) {
    await this.issuePasswordResetToken(user.id, user.email, user.name, ctx);
  }

  return { message: 'If this email exists, a reset link has been sent' };
}

async resetPassword(dto: { token: string; newPassword: string }, ctx?: RequestContext): Promise<{ message: string }> {
  const tokenHash = this.hashToken(dto.token);
  const record = await this.prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new BadRequestException('Invalid or expired reset token');
  }

  const hashedPassword = await this.hashPassword(dto.newPassword);

  await this.prisma.$transaction([
    this.prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    }),
    this.prisma.passwordResetToken.delete({ where: { tokenHash } }),
    this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  await this.writeAuditLog(record.userId, AuditAction.PASSWORD_RESET, ctx);

  return { message: 'Password reset successfully' };
}
}
