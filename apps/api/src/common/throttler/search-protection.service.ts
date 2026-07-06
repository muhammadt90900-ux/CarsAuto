// apps/api/src/common/throttler/search-protection.service.ts
import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
// F-SEC fix (Prompt 6): not explicitly named in the prompt's list, but this
// is rate-limiting (same bucket as ThrottlerStorageService/
// IpThrottleMiddleware) — moved to CriticalStateService for the same
// eviction-safety reason. Flagged to GJ as a judgment call, not silently.
import { CriticalStateService } from '../cache/critical-state.service';

const SEARCH_LIMIT_PER_MINUTE       = 60;
const AUTOCOMPLETE_LIMIT_PER_MINUTE = 120;
const AUTOCOMPLETE_LIMIT_PER_SECOND = 5;
const MAX_QUERY_LENGTH = 200;
const MAX_PAGE  = 200;
const MAX_LIMIT = 100;

const BLOCKED_PATTERNS = [
  /[<>{}[\]\\]/,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|CAST)\b/i,
  /\$\{.*?\}/,
  /\.\.\//,
];

@Injectable()
export class SearchProtectionService {
  private readonly logger = new Logger(SearchProtectionService.name);

  constructor(private readonly cache: CriticalStateService) {}

  async checkSearchRate(ip: string): Promise<void> {
    const key = `search:rate:${ip}`;
    const now = Date.now();
    const entry = await this.cache.get<{ hits: number; expiresAt: number }>(key);

    let hits: number;
    let expiresAt: number;

    if (entry) {
      hits      = entry.value.hits + 1;
      expiresAt = entry.value.expiresAt;
      await this.cache.set(key, { hits, expiresAt }, expiresAt - now);
    } else {
      hits      = 1;
      expiresAt = now + 60_000;
      await this.cache.set(key, { hits, expiresAt }, 60_000);
    }

    if (hits > SEARCH_LIMIT_PER_MINUTE) {
      const retryAfter = Math.ceil((expiresAt - now) / 1000);
      this.logger.warn(`Search rate limit exceeded for IP ${ip}`);
      throw new HttpException(
        `Search rate limit exceeded. Retry after ${retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async checkAutocompleteRate(ip: string): Promise<void> {
    const now = Date.now();

    // Per-second burst cap
    const secKey   = `ac:burst:${ip}`;
    const secEntry = await this.cache.get<{ hits: number; expiresAt: number }>(secKey);
    let secHits: number;
    let secExpiry: number;

    if (secEntry) {
      secHits   = secEntry.value.hits + 1;
      secExpiry = secEntry.value.expiresAt;
      await this.cache.set(secKey, { hits: secHits, expiresAt: secExpiry }, secExpiry - now);
    } else {
      secHits   = 1;
      secExpiry = now + 1_000;
      await this.cache.set(secKey, { hits: secHits, expiresAt: secExpiry }, 1_000);
    }

    if (secHits > AUTOCOMPLETE_LIMIT_PER_SECOND) {
      throw new HttpException('Autocomplete request rate too high.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Per-minute cap
    const minKey   = `ac:rate:${ip}`;
    const minEntry = await this.cache.get<{ hits: number; expiresAt: number }>(minKey);
    let minHits: number;
    let minExpiry: number;

    if (minEntry) {
      minHits   = minEntry.value.hits + 1;
      minExpiry = minEntry.value.expiresAt;
      await this.cache.set(minKey, { hits: minHits, expiresAt: minExpiry }, minExpiry - now);
    } else {
      minHits   = 1;
      minExpiry = now + 60_000;
      await this.cache.set(minKey, { hits: minHits, expiresAt: minExpiry }, 60_000);
    }

    if (minHits > AUTOCOMPLETE_LIMIT_PER_MINUTE) {
      throw new HttpException('Autocomplete minute limit exceeded.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  validateQuery(raw: string | undefined): string {
    if (!raw || typeof raw !== 'string') return '';
    const q = raw.trim();
    if (q.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(`Search query too long (max ${MAX_QUERY_LENGTH} characters).`);
    }
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(q)) {
        this.logger.warn(`Blocked suspicious search query: ${q.slice(0, 50)}`);
        throw new BadRequestException('Search query contains invalid characters.');
      }
    }
    return q;
  }

  validatePagination(page: number, limit: number): { page: number; limit: number } {
    const safePage  = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
    if (safePage > MAX_PAGE) {
      throw new BadRequestException(`Page number too high (max ${MAX_PAGE}).`);
    }
    return { page: safePage, limit: safeLimit };
  }
}
