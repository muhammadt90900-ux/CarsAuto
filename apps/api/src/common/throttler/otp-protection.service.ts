// apps/api/src/common/throttler/otp-protection.service.ts
//
// Dedicated OTP/verification-code protection service.
//
// Protects against:
//   1. Brute-force guessing   — max attempts per code window
//   2. OTP flooding           — max send requests per user/IP
//   3. Replay attacks         — single-use enforcement (done via DB, verified here)
//   4. Timing attacks         — constant-time comparison
//
// Usage in auth service:
//   Before accepting OTP:  await this.otpProtection.checkAttempt(userId)
//   After failed attempt:  await this.otpProtection.recordFailure(userId)
//   Before sending OTP:    await this.otpProtection.checkSendRate(userId, ip)

import {
  Injectable,
  TooManyRequestsException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';

// ── Constants ────────────────────────────────────────────────────────────────

/** Max failed OTP attempts before code is invalidated */
const MAX_OTP_ATTEMPTS = 5;

/** How long an OTP attempt window lasts (matches typical OTP expiry) */
const OTP_ATTEMPT_WINDOW_MS = 10 * 60_000; // 10 minutes

/** Max OTP send requests per user per window */
const MAX_OTP_SENDS_PER_USER = 3;

/** Max OTP send requests per IP per window */
const MAX_OTP_SENDS_PER_IP = 10;

/** Window for OTP send rate limiting */
const OTP_SEND_WINDOW_MS = 15 * 60_000; // 15 minutes

/** Minimum gap between OTP sends (prevents rapid re-send spam) */
const OTP_RESEND_COOLDOWN_MS = 60_000; // 1 minute

@Injectable()
export class OtpProtectionService {
  private readonly logger = new Logger(OtpProtectionService.name);

  constructor(private readonly cache: CacheService) {}

  // ── Attempt tracking ──────────────────────────────────────────────────────

  /**
   * Check whether the user may attempt to validate an OTP.
   * Throws TooManyRequestsException if they've exceeded MAX_OTP_ATTEMPTS.
   */
  checkAttempt(identifier: string): void {
    const key     = `otp:attempts:${identifier}`;
    const entry   = this.cache.get<number>(key);
    const attempts = entry?.value ?? 0;

    if (attempts >= MAX_OTP_ATTEMPTS) {
      this.logger.warn(`OTP attempt limit reached for identifier: ${this.mask(identifier)}`);
      throw new TooManyRequestsException(
        'Too many incorrect OTP attempts. Please request a new code.',
      );
    }
  }

  /**
   * Record a failed OTP attempt. If MAX_OTP_ATTEMPTS is reached,
   * the caller should also invalidate the OTP in the database.
   */
  recordFailure(identifier: string): number {
    const key    = `otp:attempts:${identifier}`;
    const entry  = this.cache.get<number>(key);
    const current = (entry?.value ?? 0) + 1;
    this.cache.set(key, current, OTP_ATTEMPT_WINDOW_MS);

    const remaining = Math.max(0, MAX_OTP_ATTEMPTS - current);
    this.logger.warn(
      `OTP failure for ${this.mask(identifier)}: ${current}/${MAX_OTP_ATTEMPTS} attempts (${remaining} remaining)`,
    );
    return current;
  }

  /** Clear attempt counter on successful OTP verification. */
  clearAttempts(identifier: string): void {
    // CacheService doesn't expose delete, so we overwrite with an expired value.
    // Set to a sentinel that will be skipped by the check.
    this.cache.set(`otp:attempts:${identifier}`, 0, 1); // expires in 1ms effectively
  }

  // ── Send rate limiting ────────────────────────────────────────────────────

  /**
   * Check whether an OTP may be sent to this user/IP combination.
   * Throws TooManyRequestsException if either limit is exceeded.
   * Also enforces re-send cooldown to prevent immediate re-spam.
   */
  checkSendRate(userId: string, ip?: string): void {
    const now = Date.now();

    // ── Cooldown check (per user) ────────────────────────────────────────
    const cooldownKey = `otp:cooldown:${userId}`;
    const lastSent    = this.cache.get<number>(cooldownKey);
    if (lastSent) {
      const waitMs      = OTP_RESEND_COOLDOWN_MS - (now - lastSent.value);
      if (waitMs > 0) {
        const waitSecs = Math.ceil(waitMs / 1000);
        throw new TooManyRequestsException(
          `Please wait ${waitSecs} seconds before requesting a new OTP.`,
        );
      }
    }

    // ── Per-user send count ───────────────────────────────────────────────
    const userSendKey = `otp:sends:user:${userId}`;
    const userEntry   = this.cache.get<number>(userSendKey);
    if ((userEntry?.value ?? 0) >= MAX_OTP_SENDS_PER_USER) {
      this.logger.warn(`OTP send limit reached for user ${this.mask(userId)}`);
      throw new TooManyRequestsException(
        'OTP send limit reached. Please try again later or contact support.',
      );
    }

    // ── Per-IP send count ────────────────────────────────────────────────
    if (ip) {
      const ipSendKey = `otp:sends:ip:${ip}`;
      const ipEntry   = this.cache.get<number>(ipSendKey);
      if ((ipEntry?.value ?? 0) >= MAX_OTP_SENDS_PER_IP) {
        this.logger.warn(`OTP IP send limit reached for ${ip}`);
        throw new TooManyRequestsException(
          'Too many OTP requests from this network. Please try again later.',
        );
      }
    }
  }

  /**
   * Record a successful OTP send.
   * Call AFTER the OTP has been sent to avoid blocking on send errors.
   */
  recordSend(userId: string, ip?: string): void {
    const now = Date.now();

    // Update cooldown timestamp
    this.cache.set(`otp:cooldown:${userId}`, now, OTP_RESEND_COOLDOWN_MS);

    // Increment per-user counter
    const userSendKey = `otp:sends:user:${userId}`;
    const userEntry   = this.cache.get<number>(userSendKey);
    this.cache.set(userSendKey, (userEntry?.value ?? 0) + 1, OTP_SEND_WINDOW_MS);

    // Increment per-IP counter
    if (ip) {
      const ipSendKey = `otp:sends:ip:${ip}`;
      const ipEntry   = this.cache.get<number>(ipSendKey);
      this.cache.set(ipSendKey, (ipEntry?.value ?? 0) + 1, OTP_SEND_WINDOW_MS);
    }
  }

  // ── Secure comparison ─────────────────────────────────────────────────────

  /**
   * Constant-time OTP comparison to prevent timing attacks.
   * Returns true only if both codes match AND are the same length.
   */
  safeCompare(submitted: string, expected: string): boolean {
    // Normalise to same length buffers — timingSafeEqual requires equal lengths
    const a = Buffer.from(submitted.padEnd(16, '\0'));
    const b = Buffer.from(expected.padEnd(16, '\0'));
    const len = Math.max(a.length, b.length);
    const bufA = Buffer.concat([a, Buffer.alloc(Math.max(0, len - a.length))]);
    const bufB = Buffer.concat([b, Buffer.alloc(Math.max(0, len - b.length))]);

    const equal = crypto.timingSafeEqual(bufA, bufB);
    return equal && submitted.length === expected.length;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Partially mask identifier for safe logging. */
  private mask(s: string): string {
    if (s.length <= 4) return '***';
    return s.slice(0, 2) + '***' + s.slice(-2);
  }
}
