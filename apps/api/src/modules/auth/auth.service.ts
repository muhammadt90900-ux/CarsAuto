// apps/api/src/modules/auth/auth.service.ts
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1_000; // 15 minutes
const REFRESH_TOKEN_BYTES = 64;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  // ── Register ─────────────────────────────────────────────────────────────
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

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        password: hash,
        ...(dto.phone ? { phone: dto.phone } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        verified: true,
      },
    });

    this.logger.log(`New user registered: ${user.id}`);
    return this.issueTokenPair(user);
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        verified: true,
        password: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // ── Account lockout check ───────────────────────────────────────────────
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new ForbiddenException(
        `ئەکاونتەکەت کلاو کراوەتەوە. ${minutesLeft} خولەک دوا دوبارە هەوڵ بدەوە / ` +
          `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    // ── Credential check (always run bcrypt to prevent timing attacks) ──────
    const validPassword =
      user?.password && (await bcrypt.compare(dto.password, user.password));

    if (!user || !validPassword) {
      if (user) await this.recordFailedLogin(user.id, user.failedLoginAttempts);
      // Uniform error — do NOT distinguish "no user" from "wrong password"
      throw new UnauthorizedException(
        'ئیمەیڵ یان پاسوۆرد هەڵەیە / Invalid email or password',
      );
    }

    // ── Success — reset failed-login counter ────────────────────────────────
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

  // ── Refresh token rotation ────────────────────────────────────────────────
  async refreshTokens(rawToken: string | undefined) {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
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

    if (!stored || stored.expiresAt < new Date()) {
      // Possible token reuse — revoke all tokens for this family
      if (stored) {
        await this.prisma.refreshToken.deleteMany({
          where: { userId: stored.userId },
        });
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.user.lockedUntil && stored.user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is locked');
    }

    // ── Rotate: delete old, issue new ──────────────────────────────────────
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.issueTokenPair(stored.user);
  }

  // ── Revoke refresh token (logout) ─────────────────────────────────────────
  async revokeRefreshToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────
  private async issueTokenPair(user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    verified: boolean;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const access_token = this.jwt.sign(payload);

    // Generate a cryptographically secure refresh token
    const rawRefresh = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(
      Date.now() +
        this.parseDuration(this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')),
    );

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // Prune old tokens (keep last 5 per user to handle multi-device)
    await this.pruneOldRefreshTokens(user.id);

    return {
      access_token,
      refresh_token: rawRefresh,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        role: user.role,
        verified: user.verified,
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
        ...(shouldLock
          ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) }
          : {}),
      },
    });
    if (shouldLock) {
      this.logger.warn(`Account locked due to failed attempts: ${userId}`);
    }
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

  /** Parse duration string like '7d', '15m', '1h' to milliseconds */
  private parseDuration(str: string): number {
    const units: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 86_400_000;
    return parseInt(match[1], 10) * (units[match[2]] ?? 86_400_000);
  }
}
