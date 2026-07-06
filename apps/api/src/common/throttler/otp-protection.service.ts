// apps/api/src/common/throttler/otp-protection.service.ts
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
// F-SEC fix (Prompt 6): OTP counters are security-critical — moved from
// CacheService to CriticalStateService (separate Redis connection,
// noeviction). Same API, so only this import changed.
import { CriticalStateService } from '../cache/critical-state.service';

const MAX_OTP_ATTEMPTS       = 5;
const OTP_ATTEMPT_WINDOW_MS  = 10 * 60_000;
const MAX_OTP_SENDS_PER_USER = 3;
const MAX_OTP_SENDS_PER_IP   = 10;
const OTP_SEND_WINDOW_MS     = 15 * 60_000;
const OTP_RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class OtpProtectionService {
  private readonly logger = new Logger(OtpProtectionService.name);

  constructor(private readonly cache: CriticalStateService) {}

  async checkAttempt(identifier: string): Promise<void> {
    const key     = `otp:attempts:${identifier}`;
    const entry   = await this.cache.get<number>(key);
    const attempts = entry?.value ?? 0;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      this.logger.warn(`OTP attempt limit reached for: ${this.mask(identifier)}`);
      throw new HttpException(
        'Too many incorrect OTP attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailure(identifier: string): Promise<number> {
    const key     = `otp:attempts:${identifier}`;
    const entry   = await this.cache.get<number>(key);
    const current = (entry?.value ?? 0) + 1;
    await this.cache.set(key, current, OTP_ATTEMPT_WINDOW_MS);
    const remaining = Math.max(0, MAX_OTP_ATTEMPTS - current);
    this.logger.warn(
      `OTP failure for ${this.mask(identifier)}: ${current}/${MAX_OTP_ATTEMPTS} (${remaining} remaining)`,
    );
    return current;
  }

  async clearAttempts(identifier: string): Promise<void> {
    await this.cache.set(`otp:attempts:${identifier}`, 0, 1);
  }

  async checkSendRate(userId: string, ip?: string): Promise<void> {
    const now = Date.now();

    const lastSent = await this.cache.get<number>(`otp:cooldown:${userId}`);
    if (lastSent) {
      const waitMs = OTP_RESEND_COOLDOWN_MS - (now - lastSent.value);
      if (waitMs > 0) {
        throw new HttpException(
          `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting a new OTP.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const userEntry = await this.cache.get<number>(`otp:sends:user:${userId}`);
    if ((userEntry?.value ?? 0) >= MAX_OTP_SENDS_PER_USER) {
      this.logger.warn(`OTP send limit reached for user ${this.mask(userId)}`);
      throw new HttpException(
        'OTP send limit reached. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (ip) {
      const ipEntry = await this.cache.get<number>(`otp:sends:ip:${ip}`);
      if ((ipEntry?.value ?? 0) >= MAX_OTP_SENDS_PER_IP) {
        this.logger.warn(`OTP IP send limit reached for ${ip}`);
        throw new HttpException(
          'Too many OTP requests from this network.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  async recordSend(userId: string, ip?: string): Promise<void> {
    const now = Date.now();
    await this.cache.set(`otp:cooldown:${userId}`, now, OTP_RESEND_COOLDOWN_MS);

    const userEntry = await this.cache.get<number>(`otp:sends:user:${userId}`);
    await this.cache.set(`otp:sends:user:${userId}`, (userEntry?.value ?? 0) + 1, OTP_SEND_WINDOW_MS);

    if (ip) {
      const ipEntry = await this.cache.get<number>(`otp:sends:ip:${ip}`);
      await this.cache.set(`otp:sends:ip:${ip}`, (ipEntry?.value ?? 0) + 1, OTP_SEND_WINDOW_MS);
    }
  }

  safeCompare(submitted: string, expected: string): boolean {
    const len  = Math.max(submitted.length, expected.length, 16);
    const bufA = Buffer.from(submitted.padEnd(len, '\0'));
    const bufB = Buffer.from(expected.padEnd(len, '\0'));
    return crypto.timingSafeEqual(bufA, bufB) && submitted.length === expected.length;
  }

  private mask(s: string): string {
    if (s.length <= 4) return '***';
    return s.slice(0, 2) + '***' + s.slice(-2);
  }
}
