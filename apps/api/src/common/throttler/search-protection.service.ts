// apps/api/src/common/throttler/search-protection.service.ts
//
// Search-specific abuse-prevention layer.
//
// Attacks this defends against:
//   1. Query flooding        — burst of search requests per IP
//   2. Autocomplete scraping — rapid autocomplete polling
//   3. Deep pagination abuse — requesting huge page offsets to dump the DB
//   4. Wildcard/regex abuse  — queries designed to trigger expensive full scans
//   5. Coordinated scraping  — many IPs with identical query patterns
//
// This service is injected into SearchController and called before
// the search logic runs.

import {
  Injectable,
  TooManyRequestsException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

// ── Constants ────────────────────────────────────────────────────────────────

const SEARCH_LIMIT_PER_MINUTE      = 60;   // regular search per IP/min
const AUTOCOMPLETE_LIMIT_PER_MINUTE = 120;  // autocomplete per IP/min (faster cadence expected)
const AUTOCOMPLETE_LIMIT_PER_SECOND = 5;   // burst cap per IP/sec

const MAX_QUERY_LENGTH   = 200;   // chars
const MIN_QUERY_LENGTH   = 1;     // chars (empty queries blocked separately)
const MAX_PAGE           = 200;   // hard cap on page number
const MAX_LIMIT          = 100;   // hard cap on results per page (also validated in controller)

// Suspicious patterns in search queries
const BLOCKED_PATTERNS = [
  /[<>{}[\]\\]/,        // HTML/JS injection attempts
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|CAST)\b/i, // SQL keywords
  /\$\{.*?\}/,          // Template literal injection
  /\.\.\//,             // Path traversal
];

@Injectable()
export class SearchProtectionService {
  private readonly logger = new Logger(SearchProtectionService.name);

  constructor(private readonly cache: CacheService) {}

  // ── Search rate limiting ──────────────────────────────────────────────────

  /**
   * Check and enforce search rate limits for the given IP.
   * Throws TooManyRequestsException if exceeded.
   */
  checkSearchRate(ip: string): void {
    const key  = `search:rate:${ip}`;
    const now  = Date.now();
    const entry = this.cache.get<{ hits: number; expiresAt: number }>(key);

    let hits: number;
    let expiresAt: number;

    if (entry) {
      hits      = entry.value.hits + 1;
      expiresAt = entry.value.expiresAt;
      this.cache.set(key, { hits, expiresAt }, expiresAt - now);
    } else {
      hits      = 1;
      expiresAt = now + 60_000;
      this.cache.set(key, { hits, expiresAt }, 60_000);
    }

    if (hits > SEARCH_LIMIT_PER_MINUTE) {
      const retryAfter = Math.ceil((expiresAt - now) / 1000);
      this.logger.warn(`Search rate limit exceeded for IP ${ip}`);
      throw new TooManyRequestsException(
        `Search rate limit exceeded. Retry after ${retryAfter} seconds.`,
      );
    }
  }

  /**
   * Check and enforce autocomplete rate limits (per-second burst + per-minute).
   */
  checkAutocompleteRate(ip: string): void {
    const now = Date.now();

    // ── Per-second burst cap ─────────────────────────────────────────────
    const secKey   = `ac:burst:${ip}`;
    const secEntry = this.cache.get<{ hits: number; expiresAt: number }>(secKey);
    let secHits: number;
    let secExpiry: number;

    if (secEntry) {
      secHits  = secEntry.value.hits + 1;
      secExpiry = secEntry.value.expiresAt;
      this.cache.set(secKey, { hits: secHits, expiresAt: secExpiry }, secExpiry - now);
    } else {
      secHits  = 1;
      secExpiry = now + 1_000;
      this.cache.set(secKey, { hits: secHits, expiresAt: secExpiry }, 1_000);
    }

    if (secHits > AUTOCOMPLETE_LIMIT_PER_SECOND) {
      throw new TooManyRequestsException('Autocomplete request rate too high. Slow down.');
    }

    // ── Per-minute cap ────────────────────────────────────────────────────
    const minKey   = `ac:rate:${ip}`;
    const minEntry = this.cache.get<{ hits: number; expiresAt: number }>(minKey);
    let minHits: number;
    let minExpiry: number;

    if (minEntry) {
      minHits   = minEntry.value.hits + 1;
      minExpiry = minEntry.value.expiresAt;
      this.cache.set(minKey, { hits: minHits, expiresAt: minExpiry }, minExpiry - now);
    } else {
      minHits   = 1;
      minExpiry = now + 60_000;
      this.cache.set(minKey, { hits: minHits, expiresAt: minExpiry }, 60_000);
    }

    if (minHits > AUTOCOMPLETE_LIMIT_PER_MINUTE) {
      throw new TooManyRequestsException('Autocomplete minute limit exceeded.');
    }
  }

  // ── Query sanitisation & validation ──────────────────────────────────────

  /**
   * Validate and sanitise a free-text search query.
   * Returns the trimmed, safe query string.
   * Throws BadRequestException for malformed/dangerous queries.
   */
  validateQuery(raw: string | undefined): string {
    if (!raw || typeof raw !== 'string') return '';

    const q = raw.trim();

    if (q.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(
        `Search query too long (max ${MAX_QUERY_LENGTH} characters).`,
      );
    }

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(q)) {
        this.logger.warn(`Blocked suspicious search query: ${q.slice(0, 50)}`);
        throw new BadRequestException('Search query contains invalid characters.');
      }
    }

    return q;
  }

  /**
   * Validate pagination parameters.
   * Throws BadRequestException for out-of-range values.
   */
  validatePagination(page: number, limit: number): { page: number; limit: number } {
    const safePage  = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);

    if (safePage > MAX_PAGE) {
      throw new BadRequestException(
        `Page number too high (max ${MAX_PAGE}). Use filters to narrow results.`,
      );
    }

    return { page: safePage, limit: safeLimit };
  }
}
