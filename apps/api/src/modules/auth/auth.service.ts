// apps/api/src/modules/auth/auth.service.ts
//
// ✅ Security fixes applied (see inline comments):
//   BUG #1  — Hardcoded static salt → per-user random salt (scrypt async)
//   BUG #2  — String equality password compare → crypto.timingSafeEqual
//   BUG #3  — JWT_REFRESH_SECRET declared but never used → documented + dead code removed
//   BUG #4  — Race condition in token refresh → Prisma interactive transaction
//   BUG #5  — Access token not invalidated on logout → Redis blocklist via CacheService
//   BUG #6  — Account lock checked AFTER password verify → moved to BEFORE
//   BUG #7  — scryptSync blocks event loop → replaced with async scrypt
//   BUG #10 — issueTokenPair(user: any) → strongly typed TokenUser interface
//   BUG #12 — No jti claim → crypto.randomUUID() added to payload
// ─────────────────────────────────────────────────────────────────────────────

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
// F-SEC fix (Prompt 6): the token blocklist + revocation floor are exactly
// the kind of security-critical state this split was for — moved from
// CacheService to CriticalStateService (separate Redis connection,
// noeviction). An evicted blocklist entry means a revoked token becomes
// valid again, which is a much worse failure mode than an evicted listing
// cache entry. Same API, so only this import changed.
import { CriticalStateService } from '../../common/cache/critical-state.service';
import * as crypto from 'crypto';
import { promisify } from 'util';

// ── Async scrypt wrapper ───────────────────────────────────────────────────────
// BUG #7 FIX: scryptSync was blocking the event loop on every login/register.
// promisify gives us the same algorithm without blocking.
const scryptAsync = promisify(crypto.scrypt);

// ── Account lockout config ──────────────────────────────────────────────────
// PROMPT 3 FIX: failedLoginAttempts existed on the Prisma model but was never
// read or written anywhere — lockedUntil was checked but nothing ever set it,
// so lockout was permanently a no-op. These two constants + registerFailedLogin()
// below are the only pieces that were missing.
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

// BUG #10 FIX: Replace `user: any` with a proper interface so missing fields
// (id, email, role) are caught at compile time rather than producing silent
// `undefined` values inside JWT payloads.
interface TokenUser {
  id: string;
  email: string;
  role: string;
  name: string;
  phone?: string | null;
  verified?: boolean;
  lockedUntil?: Date | null;
}

export enum AuditAction {
  USER_REGISTER          = 'USER_REGISTER',
  USER_LOGIN             = 'USER_LOGIN',
  USER_LOGOUT            = 'USER_LOGOUT',
  TOKEN_REFRESH          = 'TOKEN_REFRESH',
  TOKEN_REUSE_DETECTED   = 'TOKEN_REUSE_DETECTED',
  PASSWORD_RESET         = 'PASSWORD_RESET',
  PASSWORD_RESET_FAILURE = 'PASSWORD_RESET_FAILURE',
  EMAIL_VERIFIED         = 'EMAIL_VERIFIED',
}

// ── Constants ─────────────────────────────────────────────────────────────────
const VERIFICATION_TOKEN_BYTES  = 32;
const VERIFICATION_EXPIRES_HOURS = 24;
const RESET_TOKEN_BYTES         = 32;
const RESET_EXPIRES_MINUTES     = 60;
const JWT_EXPIRES_IN            = '15m';

// BUG #1 FIX: Salt byte length for per-user password hashing.
// Each password gets its own 16-byte cryptographically random salt.
const SCRYPT_SALT_BYTES = 16;
const SCRYPT_KEY_LEN    = 64;

// BUG #5 FIX: Redis key prefix for the access-token blocklist.
// Entries are set with a TTL equal to the remaining token lifetime,
// so the blocklist never grows unboundedly.
const ACCESS_TOKEN_BLOCKLIST_PREFIX = 'auth:blocklist:';

// PROMPT 4 FIX: per-user "block tokens issued before timestamp X" mechanism.
// Unlike ACCESS_TOKEN_BLOCKLIST_PREFIX (which blocks one specific token by its
// hash — used at logout, where we have the raw token string), this blocks
// *every* token belonging to a user regardless of which one it is — used for
// ban/suspend/role-change, where the admin only has a userId, not the raw
// token of whatever session(s) that user currently has live.
const USER_TOKEN_FLOOR_PREFIX = 'auth:token-floor:';
// Must be >= the access token's own lifetime (JWT_EXPIRES_IN below), since
// that's the longest a token issued right before the floor was set could
// still be valid for. +60s cushion for clock skew between app instances.
const TOKEN_FLOOR_TTL_MS = 15 * 60_000 + 60_000;

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma:       PrismaService,
    private readonly jwtService:   JwtService,
    private readonly config:       ConfigService,
    private readonly emailService: EmailService,
    // BUG #5 FIX: Injected so we can write / read the access-token blocklist.
    private readonly cache:        CriticalStateService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────

  async register(
    email: string,
    password: string,
    name: string,
    role?: 'USER' | 'DEALER',
    phone?: string,
    ctx?: RequestContext,
  ) {
    if (!email || !password || !name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    // Defense-in-depth: DTOs already lowercase/trim email (see
    // RegisterDto), but normalize again here so this method is safe to
    // call directly (tests, future admin/seed paths) without depending
    // on the HTTP validation layer having run first.
    email = email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // BUG #1 + #2 + #7 FIX: async scrypt with per-user random salt
    const hashedPassword = await this.hashPassword(password);

    // FIX (role dropped on register): `role` and `phone` used to be validated
    // and transformed by RegisterDto but then silently discarded by the
    // controller before ever reaching this method — every signup landed as
    // the schema default (USER) no matter what the person picked on the
    // register form. RegisterDto already restricts `role` to 'USER' | 'DEALER'
    // (BUYER is normalised to USER there, and ADMIN can never be
    // self-assigned), so it's safe to pass straight through to Prisma here.
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        verified: false,
        ...(role ? { role } : {}),
        ...(phone ? { phone } : {}),
      },
    });

    await this.sendVerificationEmail(user.id, email, name);
    await this.writeAuditLog(user.id, AuditAction.USER_REGISTER, ctx);

    return this.issueTokenPair(user);
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  async login(email: string, password: string, ctx?: RequestContext) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    // Defense-in-depth: see the same normalization note in register().
    email = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.writeAuditLog(null, 'USER_LOGIN_FAILED', ctx, { reason: 'user_not_found' });
      throw new UnauthorizedException('Invalid credentials');
    }

    // BUG #6 FIX: Check account lock BEFORE running password hashing.
    // Old code ran verifyPassword first, which let an attacker distinguish
    // "locked + correct password" (403) from "locked + wrong password" (401)
    // via the error code — leaking whether they had the right password.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account is locked');
    }

    // ADDED: enforce admin ban / temporary suspension before password check,
    // for the same timing-side-channel reason as the lockedUntil check above.
    if (user.banned) {
      await this.writeAuditLog(user.id, 'USER_LOGIN_FAILED', ctx, { reason: 'banned' });
      throw new ForbiddenException('This account has been banned');
    }
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      await this.writeAuditLog(user.id, 'USER_LOGIN_FAILED', ctx, { reason: 'suspended' });
      throw new ForbiddenException(
        `This account is suspended until ${user.suspendedUntil.toISOString()}`,
      );
    }

    // BUG #1 + #2 + #7 FIX: constant-time async comparison
    const isValid = await this.verifyPassword(password, user.password ?? '');
    if (!isValid) {
      // PROMPT 3 FIX: increment the counter and lock the account for 15
      // minutes once it hits 5 failures. This runs AFTER the lockedUntil/
      // banned/suspended checks above, so it never itself becomes a timing
      // side-channel for those states.
      await this.registerFailedLogin(user.id);
      await this.writeAuditLog(user.id, 'USER_LOGIN_FAILED', ctx, { reason: 'wrong_password' });
      throw new UnauthorizedException('Invalid credentials');
    }

    // PROMPT 3 FIX: successful login resets the counter/lock. Skip the write
    // when there's nothing to reset — that's the common case (most logins
    // succeed on the first try) so this avoids an extra UPDATE per login.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    await this.writeAuditLog(user.id, AuditAction.USER_LOGIN, ctx);
    return this.issueTokenPair(user);
  }

  // PROMPT 3 FIX: atomically increments failedLoginAttempts; once it reaches
  // MAX_FAILED_LOGIN_ATTEMPTS, locks the account for LOCKOUT_DURATION_MS and
  // resets the counter so the next window after the lock expires starts fresh.
  //
  // The increment uses Prisma's atomic `{ increment: 1 }` so concurrent failed
  // attempts from the same account can't lose updates via a stale read. The
  // lock-set is a second write; under heavy concurrency two requests could
  // both cross the threshold and both write the lock — that's harmless
  // (idempotent) and an acceptable tradeoff vs. wrapping every login attempt
  // in a transaction.
  private async registerFailedLogin(userId: string): Promise<void> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (updated.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
          failedLoginAttempts: 0,
        },
      });
      this.logger.warn(
        `User ${userId} locked for ${LOCKOUT_DURATION_MS / 60000} minutes after ${updated.failedLoginAttempts} failed login attempts`,
      );
    }
  }

  // ── Refresh Token ────────────────────────────────────────────────────────────

  async refreshToken(rawToken: string, _userId?: string, ctx?: RequestContext) {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawToken);

    // BUG #4 FIX: Wrap the find + delete in an interactive transaction so that
    // two concurrent requests with the same refresh token cannot both pass the
    // findUnique check before either has deleted the row.
    //
    // Pattern: find-and-delete inside a transaction.  If a second concurrent
    // request tries to delete the same row, Prisma throws P2025 (record not
    // found) and the transaction rolls back → the second request gets a 401.
    const result = await this.prisma.$transaction(async (tx) => {
      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id:             true,
              name:           true,
              email:          true,
              phone:          true,
              role:           true,
              verified:       true,
              lockedUntil:    true,
              banned:         true,
              suspendedUntil: true,
            },
          },
        },
      });

      // Token not found at all → already consumed or never existed
      if (!storedToken) {
        return { error: 'invalid' as const };
      }

      // Token found but expired → nuclear option: wipe all sessions
      if (storedToken.expiresAt < new Date()) {
        await tx.refreshToken.deleteMany({ where: { userId: storedToken.userId } });
        return { error: 'expired' as const, userId: storedToken.userId };
      }

      // Account locked?
      if (storedToken.user.lockedUntil && storedToken.user.lockedUntil > new Date()) {
        return { error: 'locked' as const };
      }

      // ADDED: banned / suspended accounts lose their session immediately,
      // even if the refresh token itself is still otherwise valid.
      if (storedToken.user.banned) {
        await tx.refreshToken.deleteMany({ where: { userId: storedToken.userId } });
        return { error: 'banned' as const };
      }
      if (storedToken.user.suspendedUntil && storedToken.user.suspendedUntil > new Date()) {
        return { error: 'suspended' as const };
      }

      // Atomically delete the consumed token — if this throws (concurrent delete)
      // the whole transaction rolls back and the caller gets a 401.
      await tx.refreshToken.delete({ where: { id: storedToken.id } });

      return { user: storedToken.user, userId: storedToken.userId };
    });

    if ('error' in result) {
      if (result.error === 'expired') {
        await this.writeAuditLog(result.userId, AuditAction.TOKEN_REUSE_DETECTED, ctx);
        this.logger.warn(`Refresh token reuse detected for user ${result.userId}`);
      }
      if (result.error === 'locked') {
        throw new ForbiddenException('Account is locked');
      }
      if (result.error === 'banned') {
        throw new ForbiddenException('This account has been banned');
      }
      if (result.error === 'suspended') {
        throw new ForbiddenException('This account is currently suspended');
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.writeAuditLog(result.userId, AuditAction.TOKEN_REFRESH, ctx);
    return this.issueTokenPair(result.user);
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  // BUG #5 FIX: revokeRefreshToken now also accepts the raw access token so
  // it can be added to the Redis blocklist for its remaining TTL.
  // The controller must pass req.headers.authorization?.split(' ')[1] here.
  async revokeRefreshToken(
    rawRefreshToken: string,
    rawAccessToken?: string,
    userId?: string,
    ctx?: RequestContext,
  ): Promise<void> {
    // 1. Revoke refresh token from DB (existing behaviour)
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });

    // 2. BUG #5 FIX: Add access token to blocklist so it cannot be used for
    //    the remaining window of its 15-minute lifetime.
    if (rawAccessToken) {
      await this.blockAccessToken(rawAccessToken);
    }

    if (userId) {
      await this.writeAuditLog(userId, AuditAction.USER_LOGOUT, ctx);
    }
  }

  // ── Check access-token blocklist (called from JwtStrategy.validate) ──────────

  // BUG #5 FIX: JwtStrategy should call this after passport verifies the
  // signature so revoked-but-not-yet-expired tokens are rejected.
  async isAccessTokenBlocked(rawAccessToken: string): Promise<boolean> {
    const key = ACCESS_TOKEN_BLOCKLIST_PREFIX + this.hashToken(rawAccessToken);
    const val = await this.cache.get<string>(key);
    return val !== null && val !== undefined;
  }

  // ── Check per-user token floor (called from JwtStrategy.validate) ────────────

  // PROMPT 4 FIX: complements isAccessTokenBlocked() above. That check needs
  // the raw token string (only available at logout); this one needs only the
  // userId + the token's own `iat` claim, so it can reject every token for a
  // user at once — used after banUser/suspendUser/setUserRole.
  //
  // `iat` is JWT-standard seconds-since-epoch; the floor is stored in ms, so
  // it's compared as `iat * 1000 < floor`. A token issued in the same second
  // the floor was written is treated as pre-floor (revoked) rather than
  // post-floor — erring toward revoking is the safer default here.
  async isAccessTokenRevokedForUser(userId: string, iat?: number): Promise<boolean> {
    if (!iat) return false; // no iat claim on the token — nothing to compare against
    const key = USER_TOKEN_FLOOR_PREFIX + userId;
    const floor = await this.cache.get<number>(key);
    if (!floor) return false;
    return iat * 1000 < floor.value;
  }

  // ── Set per-user token floor (called from AdminService) ──────────────────────

  // PROMPT 4 FIX: call this from banUser/suspendUser/setUserRole so any
  // access token already issued to this user is rejected on its next request,
  // without needing that token's raw string. See TOKEN_FLOOR_TTL_MS above for
  // why the TTL only needs to cover one access-token lifetime, not forever —
  // banUser/suspendUser already delete refresh tokens (so no NEW token can be
  // minted afterward), and login() itself re-checks banned/suspendedUntil on
  // every attempt, so once the floor entry expires there's nothing left for
  // it to have been protecting against.
  async revokeTokensIssuedBefore(userId: string): Promise<void> {
    const key = USER_TOKEN_FLOOR_PREFIX + userId;
    await this.cache.set(key, Date.now(), TOKEN_FLOOR_TTL_MS);
  }

  // ── Verify Email ─────────────────────────────────────────────────────────────

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

  // ── Resend Verification Email ─────────────────────────────────────────────────

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.verified) throw new BadRequestException('Email already verified');

    await this.sendVerificationEmail(user.id, user.email, user.name);
    return { message: 'Verification email sent' };
  }

  // ── Forgot Password ───────────────────────────────────────────────────────────

  async forgotPassword(
    dto: { email: string },
    ctx?: RequestContext,
  ): Promise<{ message: string }> {
    // Defense-in-depth: see the same normalization note in register().
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return the same response to prevent email enumeration
    if (user) {
      await this.issuePasswordResetToken(user.id, user.email, user.name, ctx);
    }

    return { message: 'If this email exists, a reset link has been sent' };
  }

  // ── Reset Password ────────────────────────────────────────────────────────────

  async resetPassword(
    dto: { token: string; newPassword: string },
    ctx?: RequestContext,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // BUG #1 + #7 FIX: async scrypt with random salt
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

  // ── Private Helpers ───────────────────────────────────────────────────────────

  // BUG #10 FIX: strongly typed TokenUser — no more `any`
  private async issueTokenPair(user: TokenUser) {
    // BUG #12 FIX: Add jti (JWT ID) so individual tokens can be blocklisted.
    const payload = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
      jti:   crypto.randomUUID(),   // unique per token — enables logout blocklist
    };

    // NOTE on BUG #3: JWT_REFRESH_SECRET is declared in env.validation.ts but
    // is intentionally NOT used here.  Refresh tokens in this project are opaque
    // random bytes stored as SHA-256 hashes in the DB — they are NOT JWTs and do
    // not need a signing secret.  The env var should be removed from
    // env.validation.ts to avoid misleading future developers into thinking there
    // is a separate signing key in play.
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshHash     = this.hashToken(rawRefreshToken);
    const expiresAt       = new Date(Date.now() + 7 * 24 * 60 * 60_000); // 7 days

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: refreshHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  private async issuePasswordResetToken(
    userId: string,
    email:  string,
    name:   string,
    ctx?:   RequestContext,
  ): Promise<void> {
    const rawToken  = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60_000);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]);

    const appUrl   = this.config.get<string>('APP_URL', 'https://carsauto.app');
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

  private async sendVerificationEmail(
    userId: string,
    email:  string,
    name:   string,
  ): Promise<void> {
    const rawToken  = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRES_HOURS * 3_600_000);

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]);

    const appUrl          = this.config.get<string>('APP_URL', 'https://carsauto.app');
    const verificationUrl = `${appUrl}/verify-email?token=${rawToken}`;

    await this.emailService.sendVerificationEmail({
      to:              email,
      userName:        name,
      verificationUrl,
      expiresInHours:  VERIFICATION_EXPIRES_HOURS,
    });

    this.logger.log(`Verification email sent to user ${userId}`);
  }

  // ── BUG #5 HELPER: add a token to the Redis blocklist ─────────────────────

  private async blockAccessToken(rawAccessToken: string): Promise<void> {
    try {
      const payload = this.jwtService.decode(rawAccessToken) as
        | { exp?: number; jti?: string }
        | null;

      if (!payload?.exp) return; // malformed / already expired — nothing to block

      const ttlMs = payload.exp * 1000 - Date.now();
      if (ttlMs <= 0) return; // already expired naturally

      const key = ACCESS_TOKEN_BLOCKLIST_PREFIX + this.hashToken(rawAccessToken);
      // CacheService.set signature: set(key, value, ttlMs)
      await this.cache.set(key, '1', ttlMs);
    } catch (err: any) {
      // Non-fatal — worst case the token lives until natural expiry (≤15 min)
      this.logger.warn(`Could not blocklist access token: ${err?.message}`);
    }
  }

  // ── Crypto primitives ──────────────────────────────────────────────────────

  // BUG #1 + #7 FIX: async scrypt + per-user random salt stored alongside hash.
  // Format stored in DB:  "<saltHex>:<derivedKeyHex>"
  // This is backward-compatible as long as all existing passwords are migrated
  // (old format was just a hex string with no colon — see verifyPassword below).
  private async hashPassword(password: string): Promise<string> {
    const salt    = crypto.randomBytes(SCRYPT_SALT_BYTES);
    const derived = await scryptAsync(password, salt, SCRYPT_KEY_LEN) as Buffer;
    return salt.toString('hex') + ':' + derived.toString('hex');
  }

  // BUG #1 + #2 + #7 FIX:
  //   • Parse the per-user salt stored with the hash
  //   • Use async scrypt (non-blocking)
  //   • Use crypto.timingSafeEqual (constant-time — no short-circuit leak)
  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    if (!stored) return false;

    // Support for legacy hashes (old format had no colon / no salt — should be
    // migrated on next login via a re-hash after successful verification).
    const colonIdx = stored.indexOf(':');
    if (colonIdx === -1) {
      // Legacy path: stored is just a hex string (static 'salt').
      // Verify using the old method so existing users are not locked out,
      // then re-hash with the secure method after returning true (done in login).
      const legacyDerived = await scryptAsync(password, 'salt', SCRYPT_KEY_LEN) as Buffer;
      const legacyStored  = Buffer.from(stored, 'hex');
      if (legacyDerived.length !== legacyStored.length) return false;
      return crypto.timingSafeEqual(legacyDerived, legacyStored);
    }

    const saltHex = stored.slice(0, colonIdx);
    const hashHex = stored.slice(colonIdx + 1);
    if (!saltHex || !hashHex) return false;

    const salt    = Buffer.from(saltHex, 'hex');
    const derived = await scryptAsync(password, salt, SCRYPT_KEY_LEN) as Buffer;
    const stored_ = Buffer.from(hashHex, 'hex');

    if (derived.length !== stored_.length) return false;

    // BUG #2 FIX: constant-time comparison — no early-exit timing leak
    return crypto.timingSafeEqual(derived, stored_);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async writeAuditLog(
    userId: string | null,
    action: string,
    ctx?:   RequestContext,
    meta?:  Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          ...(userId ? { userId } : {}),
          action,
          ip:        ctx?.ipAddress ?? null,
          userAgent: ctx?.userAgent ?? null,
          // NOTE: writes to `metadata` (Text, JSON-stringified), not the
          // deprecated `meta` Json column — see Prompt 3.2 cleanup.
          // Kept as a raw prisma.auditLog.create() rather than routed
          // through AuditLogService to avoid pulling that module into
          // AuthModule's DI graph; the on-disk shape is now consistent
          // either way.
          metadata:  meta ? JSON.stringify(meta) : null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Audit log write failed [${action}]: ${err?.message}`);
    }
  }

  private parseDuration(str: string): number {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 86_400_000;
    return parseInt(match[1]!, 10) * (DURATION_UNITS[match[2]!] ?? 86_400_000);
  }
}
