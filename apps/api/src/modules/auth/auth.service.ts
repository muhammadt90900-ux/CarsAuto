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

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1_000; // 15 minutes
const REFRESH_TOKEN_BYTES = 64;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_EXPIRES_HOURS = 24;

// FIX: Roles that public registration is allowed to set (ADMIN excluded)
const ALLOWED_SELF_ASSIGN_ROLES = new Set(['USER', 'DEALER']);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
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

    // FIX: Prevent privilege escalation — ADMIN role cannot be self-assigned at registration
    const safeRole =
      dto.role && ALLOWED_SELF_ASSIGN_ROLES.has(dto.role) ? dto.role : 'USER';

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: hash,
        ...(dto.phone ? { phone: dto.phone } : {}),
        role: safeRole as any,
        // New users start unverified
        verified: false,
      },
      select: {
        id: true, name: true, email: true, phone: true, role: true, verified: true,
      },
    });

    this.logger.log(`New user registered: ${user.id}`);

    // Send verification email asynchronously — do not block the registration response
    this.sendVerificationEmailForUser(user.id, user.email, user.name).catch((err) =>
      this.logger.error(`Failed to send verification email for ${user.id}: ${err?.message}`),
    );

    return this.issueTokenPair(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true, name: true, email: true, phone: true, role: true, verified: true,
        password: true, failedLoginAttempts: true, lockedUntil: true,
      },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(
        `ئەکاونتەکەت کلاو کراوەتەوە. ${minutesLeft} خولەک دوا دوبارە هەوڵ بدەوە / ` +
          `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const validPassword =
      user?.password && (await bcrypt.compare(dto.password, user.password));

    if (!user || !validPassword) {
      if (user) await this.recordFailedLogin(user.id, user.failedLoginAttempts);
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

    this.logger.log(`User logged in: ${user.id}`);
    const { password: _pw, failedLoginAttempts: _fa, lockedUntil: _lu, ...safeUser } = user;
    return this.issueTokenPair(safeUser);
  }

  // ── Email verification ────────────────────────────────────────────────────

  /**
   * Verify a user's email using the raw token from the URL query param.
   * Returns the updated user so the client can refresh its state.
   */
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
      // Clean up expired token
      await this.prisma.emailVerificationToken.delete({ where: { id: record.id } });
      throw new BadRequestException(
        'تۆکنی پشتڕاستکردنەوە بەسەرچووە. تکایە دوبارە بنێرە / ' +
          'Verification token has expired. Please request a new one.',
      );
    }

    if (record.user.verified) {
      // Idempotent — already verified; clean up token and succeed
      await this.prisma.emailVerificationToken.delete({ where: { id: record.id } });
      return { message: 'Email already verified', verified: true };
    }

    // Mark user as verified and remove the token atomically
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { verified: true },
      }),
      this.prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    this.logger.log(`Email verified for user: ${record.userId}`);
    return {
      message: 'ئیمەیڵەکەت بە سەرکەوتوویی پشتڕاست کرا / Email verified successfully',
      verified: true,
    };
  }

  /**
   * Resend the verification email for the authenticated user.
   * Rate-limited: only one token at a time; replaces any existing token.
   */
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

    return {
      message:
        'ئیمەیڵی پشتڕاستکردنەوە دووبارە نێردرا / Verification email resent. Please check your inbox.',
    };
  }

  // ── Refresh / revoke ──────────────────────────────────────────────────────

  async refreshTokens(rawToken: string | undefined) {
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
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.user.lockedUntil && stored.user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is locked');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokenPair(stored.user);
  }

  async revokeRefreshToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Creates a verification token record and sends the email.
   * Replaces any previous token for the same user (upsert by userId).
   */
  private async sendVerificationEmailForUser(
    userId: string,
    email: string,
    name: string,
  ): Promise<void> {
    const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRES_HOURS * 3_600_000);

    // Delete any existing token for this user, then create a fresh one
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationToken.create({
        data: { userId, tokenHash, expiresAt },
      }),
    ]);

    const appUrl = this.cfg.get<string>('APP_URL', 'https://carsauto.app');
    const verificationUrl = `${appUrl}/verify-email?token=${rawToken}`;

    await this.emailService.sendVerificationEmail({
      to: email,
      userName: name,
      verificationUrl,
      expiresInHours: VERIFICATION_EXPIRES_HOURS,
    });

    this.logger.log(`Verification email sent to user ${userId}`);
  }

  private async issueTokenPair(user: {
    id: string; name: string; email: string;
    phone?: string | null; role: string; verified: boolean;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwt.sign(payload);

    const rawRefresh = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(
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
        id: user.id, name: user.name, email: user.email,
        phone: user.phone ?? null, role: user.role, verified: user.verified,
      },
    };
  }

  private async recordFailedLogin(userId: string, currentAttempts: number) {
    const newCount = currentAttempts + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newCount,
        ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) } : {}),
      },
    });
    if (shouldLock) this.logger.warn(`Account locked due to failed attempts: ${userId}`);
  }

  private async pruneOldRefreshTokens(userId: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (tokens.length > 5) {
      const idsToDelete = tokens.slice(5).map((t) => t.id);
      await this.prisma.refreshToken.deleteMany({ where: { id: { in: idsToDelete } } });
    }
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private parseDuration(str: string): number {
    const units: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 86_400_000;
    return parseInt(match[1], 10) * (units[match[2]] ?? 86_400_000);
  }
}
