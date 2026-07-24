// apps/api/src/modules/listings/listings.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { AiService } from '../ai/ai.service';
import { TranslationService } from '../ai/translation/translation.service';
import { AuditLogService, AuditAction } from '../../common/monitoring/audit-log.service';
import { ListingType } from '@/common/prisma/enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeilisearchSearchStrategy } from '../search/meilisearch-search.strategy';
import { TrustProfileService } from '../../common/trust/trust-profile.service';
import {
  ListingCreatedEvent,
  ListingSoldEvent,
  ListingDeletedEvent,
  ListingUpdatedEvent,
  ListingSavedEvent,
} from '../../common/events';

// ── Constants ─────────────────────────────────────────────────────────────────
const CACHE_TTL_LIST   = 30_000;        // 30 s  — list pages
const CACHE_TTL_DETAIL = 2 * 60_000;   // 2 min — detail pages
const MAX_PAGE_LIMIT     = 100;
const DEFAULT_PAGE_LIMIT = 20;

// ── Translation dual-write (Phase 2 / Prompt 2.2) ───────────────────────────
//
// While the 8 legacy titleKu/titleAr/titleEn/titleZh/descriptionKu/... columns
// are still in place (kept for one release cycle — see schema.prisma), every
// write path continues to write them AND now also writes the equivalent
// ListingTranslation rows, so the new table stays correct for all listings
// created/edited from this point forward, on top of the one-time backfill
// script (prisma/migrations-manual/backfill-listing-translations.ts) that
// covers pre-existing rows.
const TRANSLATION_LOCALES = [
  { locale: 'ku', titleField: 'titleKu', descField: 'descriptionKu' },
  { locale: 'ar', titleField: 'titleAr', descField: 'descriptionAr' },
  { locale: 'en', titleField: 'titleEn', descField: 'descriptionEn' },
  { locale: 'zh', titleField: 'titleZh', descField: 'descriptionZh' },
] as const;

/**
 * Given an object that may contain titleKu/titleAr/titleEn/titleZh and/or
 * descriptionKu/descriptionAr/descriptionEn/descriptionZh, returns the
 * corresponding ListingTranslation rows — one per locale whose title field
 * is present (so a partial `update()` payload only touches the locales it
 * actually changed) and non-empty.
 */
function buildTranslationRows(
  fields: Record<string, unknown>,
): { locale: string; title: string; description: string | null }[] {
  const rows: { locale: string; title: string; description: string | null }[] = [];
  for (const { locale, titleField, descField } of TRANSLATION_LOCALES) {
    const title = fields[titleField];
    if (typeof title === 'string' && title.trim().length > 0) {
      const description = fields[descField];
      rows.push({
        locale,
        title,
        description: typeof description === 'string' ? description : null,
      });
    }
  }
  return rows;
}

// ── View counter ──────────────────────────────────────────────────────────────
//
// F-CRIT fix: was a module-level `Map<string, number>` + `setTimeout` flush
// loop. That buffer lived in a single replica's process memory, so views
// recorded against replica A were invisible to (and could be lost by a
// crash of) replica A — they never reached replica B's buffer or the DB.
// Views are now accumulated atomically in Redis (`views:{listingId}`, via
// CacheService.incrBy) and flushed to the DB every 30 s by
// ViewFlushTask (apps/api/src/modules/listings/tasks/view-flush.task.ts),
// which runs on every replica and uses Redis GETDEL so concurrent replicas
// flushing the same key never double-count.

// ── Lean select for list pages (excludes description blobs) ──────────────────
const LIST_SELECT = {
  id:         true,
  type:       true,
  status:     true,
  titleKu:    true,
  titleAr:    true,
  titleEn:    true,
  price:      true,
  currency:   true,
  negotiable: true,
  featured:   true,
  views:      true,
  createdAt:  true,
  images: {
    where:   { isCover: true },
    take:    1,
    orderBy: { order: 'asc' as const },
    select:  { url: true, id: true },
  },
  location: {
    select: { id: true, city: true, governorate: true, nameKu: true, nameEn: true },
  },
  user: {
    select: { id: true, name: true, avatar: true, verified: true },
  },
  vehicleSpec: {
    select: {
      year: true, mileageKm: true, fuelType: true, transmission: true,
      bodyType: true, condition: true, color: true,
      brand: { select: { id: true, nameEn: true, nameKu: true, logoUrl: true } },
      model: { select: { id: true, nameEn: true, nameKu: true } },
      trim:  { select: { name: true, engineLabel: true } },
    },
  },
  // Feature 3: accessory/service spec lean select
  accessorySpec: {
    select: {
      serviceType: true, mobile: true, condition: true, color: true,
      brand: true, model: true, duration: true, warranty: true,
      compatibleBrands: true, compatibleModels: true,
    },
  },
} as const;

// F-HIGH fix: shared orderBy for both pagination modes. `id: 'desc'` is a
// tiebreaker — without it, rows with an identical `createdAt` (entirely
// possible at scale, e.g. several listings created in the same request
// batch or the same millisecond) would have an unstable relative order,
// which is exactly what breaks cursor pagination (a tied row could appear
// twice across two pages, or be skipped entirely). See buildCursorCondition()
// below for why this must be a tuple comparison, not Prisma's native
// `cursor`+`skip`, once more than one field is involved.
const LIST_ORDER_BY = [
  { featured: 'desc' as const },
  { createdAt: 'desc' as const },
  { id: 'desc' as const },
];

// ── Types ─────────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = new Set<ListingType>([
  ListingType.CAR,
  ListingType.MOTORCYCLE,
  ListingType.SPARE_PART,
]);

const ACCESSORY_TYPES = new Set<ListingType>([
  ListingType.ACCESSORY,
  ListingType.SERVICE,
]);

// BUG FIX: the Sell form's drive-type select (Step2VehicleDetails.tsx) uses
// '4WD' as both the display label and the submitted value — a natural,
// user-facing choice. Prisma's DrivetrainType enum, however, has no '4WD'
// member (enum names can't start with a digit), so it's declared as
// FOUR_WD. Every other value (FWD/RWD/AWD) already matches 1:1, so only
// '4WD' needs remapping here before it reaches prisma.listing.create().
// Without this, create() throws PrismaClientValidationError ("Invalid value
// for argument drivetrain. Expected DrivetrainType.") → 500 to the client.
const DRIVETRAIN_INPUT_TO_ENUM: Record<string, string> = {
  '4WD': 'FOUR_WD',
};
function toDrivetrainEnum(input: string): string {
  return DRIVETRAIN_INPUT_TO_ENUM[input] ?? input;
}

export interface ListingQueryParams {
  type?:         string;
  minPrice?:     string;
  maxPrice?:     string;
  locationId?:   string;
  brandId?:      string;
  modelId?:      string;
  trimId?:       string;
  year?:         string;
  minYear?:      string;
  maxYear?:      string;
  condition?:    string;
  fuelType?:     string;
  transmission?: string;
  color?:        string;
  minMileage?:   string;
  maxMileage?:   string;
  page?:         string;
  limit?:        string;
  // F-HIGH fix: cursor-based pagination. Opaque, base64-encoded listing id.
  // If present, findAll() uses cursor mode regardless of whether `page` is
  // also present (cursor wins). If absent, behaviour is 100% unchanged from
  // before this fix — every existing caller (none of which send `cursor`
  // today) keeps getting the legacy { data, total, page, limit, totalPages }
  // shape via offset pagination.
  cursor?:       string;
  featured?:     string;
  search?:       string;
  sortBy?:       string;
  sortOrder?:    string;
  categoryId?:   string;
  // Feature 3 — accessory/service filters
  serviceType?:  string;
  mobile?:       string;
  // Phase 3 (Search Architecture) — "near me" bounding-box geo filter.
  // Approximate (lat/lng bounding box, not a true circle) — see
  // buildWhereClause()'s geo section for why. All three must be present
  // together; if any is missing, geo filtering is silently skipped.
  lat?:          string;
  lng?:          string;
  radiusKm?:     string;
}

// F-HIGH fix: explicit response shapes for the two pagination modes
// findAll() can return, so callers (and the controller's return type) don't
// have to infer them structurally.
export interface OffsetListingsResponse {
  data:        unknown[];
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
}

export interface CursorListingsResponse {
  data:        unknown[];
  nextCursor:  string | null;
  hasMore:     boolean;
  total:       number;
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    private readonly prisma:       PrismaService,
    private readonly cache:        CacheService,
    private readonly ai:           AiService,
    private readonly translation:  TranslationService,
    private readonly auditLog:     AuditLogService,
    // F-ARCH fix: was `private readonly dealers: DealersService` — that
    // direct injection is what forced listings.module.ts to import
    // DealersModule via forwardRef() to break the resulting circular
    // dependency. Replaced with EventEmitter2: ListingsService now emits
    // domain events and has no compile-time knowledge of DealersService at
    // all. See common/events/ and modules/dealers/dealer.listeners.ts.
    private readonly eventEmitter:  EventEmitter2,
    // Search Architecture Phase 3: powers getFacets() only — findAll()
    // above is completely unaffected by this dependency.
    private readonly meilisearchStrategy: MeilisearchSearchStrategy,
    // ADDED (Trust & Safety Prompt 6)
    private readonly trustProfile: TrustProfileService,
  ) {}

  // ── Pagination helpers ──────────────────────────────────────────────────────
  private validatePagination(page?: string, limit?: string) {
    const validPage  = Math.max(1, Number(page)  || 1);
    const validLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT));
    return { page: validPage, limit: validLimit };
  }

  private validateLimit(limit?: string): number {
    return Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT));
  }

  // ── Cursor encode/decode ─────────────────────────────────────────────────────
  // Opaque to the client — just a base64-wrapped listing id, exactly as
  // specified. (The extra fields cursor pagination needs for a correct tuple
  // comparison — featured, createdAt — are looked up server-side from that id
  // in findAllCursor(), rather than being encoded into the cursor itself, so
  // the cursor's shape/contract stays simple and stable even if the sort
  // fields ever change.)
  private encodeCursor(id: string): string {
    return Buffer.from(id, 'utf8').toString('base64');
  }

  private decodeCursor(cursor: string): string {
    try {
      const id = Buffer.from(cursor, 'base64').toString('utf8');
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('not a uuid');
      return id;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  /**
   * Builds the WHERE condition equivalent to "every row strictly after
   * `cursorRow` in LIST_ORDER_BY order".
   *
   * F-HIGH fix: deliberately NOT using Prisma's native `cursor: { id }, skip: 1`
   * here. That mechanism is only reliable when orderBy is a single field —
   * with a multi-field orderBy (featured, createdAt, id) it's a documented
   * source of skipped/duplicated rows whenever two rows share an `createdAt`
   * value (prisma/prisma#16991, prisma/prisma#19159), which is entirely
   * possible at scale. A manual tuple comparison, mirroring LIST_ORDER_BY
   * field-for-field, has no such failure mode — it can never skip or repeat
   * a row no matter how many ties exist.
   */
  private buildCursorCondition(cursorRow: { featured: boolean; createdAt: Date; id: string }): any {
    const afterByCreatedAtThenId = {
      OR: [
        { createdAt: { lt: cursorRow.createdAt } },
        { AND: [{ createdAt: cursorRow.createdAt }, { id: { lt: cursorRow.id } }] },
      ],
    };

    if (cursorRow.featured) {
      // Past-the-cursor rows are either: every non-featured row (all of
      // which sort after every featured row), OR a featured row later in
      // (createdAt, id) order.
      return { OR: [{ featured: false }, { AND: [{ featured: true }, afterByCreatedAtThenId] }] };
    }
    // Cursor itself was non-featured — every featured row was already
    // exhausted earlier in the result set, so just continue within
    // featured = false.
    return { AND: [{ featured: false }, afterByCreatedAtThenId] };
  }

  // ── Total count (only ever queried fresh on the first page) ────────────────
  private buildCountCacheKey(params: Record<string, any>): string {
    const filterParams = { ...params };
    delete filterParams.page;
    delete filterParams.limit;
    delete filterParams.cursor;
    return this.buildListCacheKey(filterParams).replace(/^listings:list:/, 'listings:count:');
  }

  private async getTotal(params: ListingQueryParams, where: any): Promise<number> {
    const countKey = this.buildCountCacheKey(params);

    // First page (no cursor yet) — always a fresh COUNT, then cache it for
    // subsequent pages of this same filter set.
    if (!params.cursor) {
      const total = await this.prisma.db('read').listing.count({ where });
      await this.cache.set(countKey, total, CACHE_TTL_LIST);
      return total;
    }

    // Later pages: read the cached total from page 1 — a Redis GET, not a
    // COUNT(*) — which is the whole point of this fix at 1M+ rows.
    const cached = await this.cache.get<number>(countKey);
    if (cached) return cached.value;

    // Cache expired mid-scroll (CACHE_TTL_LIST is short — 30s) — fall back to
    // a real count rather than returning a missing/stale total.
    const total = await this.prisma.db('read').listing.count({ where });
    await this.cache.set(countKey, total, CACHE_TTL_LIST);
    return total;
  }

  // ── findAll (offset mode — unchanged behaviour for existing callers) ───────
  private async findAllOffset(params: ListingQueryParams): Promise<OffsetListingsResponse> {
    const { page, limit } = this.validatePagination(params.page, params.limit);
    const skip  = (page - 1) * limit;
    const where = this.buildWhereClause(params);

    // F-ARCH fix: read replica — this is the canonical "browse listings" query.
    const [data, total] = await Promise.all([
      this.prisma.db('read').listing.findMany({
        where,
        skip,
        take:    limit,
        orderBy: LIST_ORDER_BY,
        select:  LIST_SELECT,
      }),
      this.prisma.db('read').listing.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── findAll (cursor mode — O(1) regardless of scroll depth) ─────────────────
  private async findAllCursor(params: ListingQueryParams): Promise<CursorListingsResponse> {
    const limit = this.validateLimit(params.limit);
    const where = this.buildWhereClause(params);

    let finalWhere = where;
    if (params.cursor) {
      const cursorId  = this.decodeCursor(params.cursor);
      const cursorRow = await this.prisma.db('read').listing.findUnique({
        where:  { id: cursorId },
        select: { featured: true, createdAt: true },
      });
      // Cursor row was deleted (or never existed) — fail clearly rather than
      // silently restarting from page 1, which would look like a buggy
      // infinite-scroll loop on the client.
      if (!cursorRow) throw new BadRequestException('Invalid or expired cursor');

      finalWhere = { AND: [where, this.buildCursorCondition({ ...cursorRow, id: cursorId })] };
    }

    // Fetch one extra row to detect whether there's a next page, with no
    // second query and no COUNT needed for this part.
    // F-ARCH fix: read replica — browse-mode query, same as offset mode above.
    const rows = await this.prisma.db('read').listing.findMany({
      where:   finalWhere,
      take:    limit + 1,
      orderBy: LIST_ORDER_BY,
      select:  LIST_SELECT,
    });

    const hasMore    = rows.length > limit;
    const data       = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? this.encodeCursor((data[data.length - 1] as any).id) : null;

    const total = await this.getTotal(params, where);

    return { data, nextCursor, hasMore, total };
  }

  // ── findAll ────────────────────────────────────────────────────────────────
  async findAll(params: ListingQueryParams, userId?: string) {
    // userId is optional — public (unauthenticated) requests omit it entirely.
    // The cache key intentionally excludes userId so public results are shared;
    // isFavorited is appended in a second pass after the cached fetch.
    //
    // F-HIGH fix: buildListCacheKey() already serialises every key present in
    // `params` generically — once `cursor` is part of ListingQueryParams, it's
    // automatically included in the cache key whenever present (and `page`
    // whenever IT is present instead), with no special-casing needed here.
    const cacheKey = this.buildListCacheKey(params);
    try {
      // Cursor wins if both are somehow present; absence of `cursor` is 100%
      // backward compatible with every existing caller (offset mode, exact
      // same response shape as before this fix).
      // F-PERF fix: getOrSetWithLock (not plain getOrSet) — this is one of
      // the hottest read paths in the app (homepage/browse), so a bare
      // cache-miss stampede here would hit Postgres with N identical
      // findMany/count queries every time CACHE_TTL_LIST expires under load.
      const base = await this.cache.getOrSetWithLock<OffsetListingsResponse | CursorListingsResponse>(
        cacheKey,
        () => (params.cursor !== undefined ? this.findAllCursor(params) : this.findAllOffset(params)),
        CACHE_TTL_LIST,
      );

      // ── isFavorited pass (only for authenticated users) ──────────────────
      // Runs outside the cache so each user gets their own favorite flags
      // without polluting the shared public cache.
      if (userId && base.data.length > 0) {
        const listingIds = base.data.map((l: any) => l.id);
        const favorites  = await this.prisma.db('read').favorite.findMany({
          where:  { userId, listingId: { in: listingIds } },
          select: { listingId: true },
        }).catch(() => [] as { listingId: string }[]);

        const favSet = new Set(favorites.map((f: { listingId: string }) => f.listingId));
        return {
          ...base,
          data: base.data.map((l: any) => ({ ...l, isFavorited: favSet.has(l.id) })),
        };
      }

      return base;
    } catch (err) {
      this.logger.error(`Failed to fetch listings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // ── findOne ────────────────────────────────────────────────────────────────
  // F3 FIX: accepts optional requestingUserId (from OptionalJwtGuard) so that:
  //   • Non-ACTIVE listings are only visible to the listing owner (or admins).
  //   • seller phone is stripped for anyone who is not the owner.
  // Cache is intentionally bypassed for non-ACTIVE listings to avoid caching
  // a pending/draft listing that a public user should never see.
  async findOne(id: string, requestingUserId?: string) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid listing ID');
    }
    const cacheKey = `listings:detail:${id}`;
    try {
      // F-ARCH fix: deliberately NOT routed to the read replica, unlike the
      // browse-mode queries above. This method serves the listing DETAIL
      // page, which has an ownership-preview path just below (an owner can
      // view their own DRAFT/PENDING/UNDER_REVIEW listing immediately after
      // creating it). Reading from a lagging replica here could 404 a
      // dealer's own just-created listing — a real-after-write consistency
      // bug, not just a performance tradeoff — so this stays on the primary.
      // F3 FIX: fetch without cache first so we can check ownership/status
      // before deciding whether to return or cache the result.
      const listing = await this.prisma.listing.findFirst({
        where:   { id, deletedAt: null },
        include: {
          images:   { orderBy: { order: 'asc' } },
          location: true,
          user: {
            select: { id: true, name: true, avatar: true, verified: true, phone: true, identityVerifiedAt: true },
          },
          vehicleSpec: {
            include: {
              brand: { select: { id: true, nameEn: true, nameAr: true, nameKu: true, logoUrl: true } },
              model: { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
              trim: {
                select: {
                  id: true, name: true, fuelType: true, transmission: true,
                  bodyType: true, drivetrain: true, engineCC: true,
                  engineLabel: true, powerKw: true, doors: true, seats: true,
                },
              },
            },
          },
          // Feature 3: include accessory/service spec on detail page
          accessorySpec: true,
        },
      });

      if (!listing) throw new NotFoundException('Listing not found');

      // F3 FIX: hide non-ACTIVE listings from everyone except the owner.
      // Returns 404 (not 403) to avoid leaking that the listing exists at all.
      const isOwner = !!requestingUserId && listing.user?.id === requestingUserId;
      if (listing.status !== 'ACTIVE' && !isOwner) {
        throw new NotFoundException('Listing not found');
      }

      // F3 FIX: strip seller phone for non-owners regardless of listing status,
      // consistent with UsersController.findById() which already does this for
      // public profile responses.
      const result = isOwner
        ? listing
        : {
            ...listing,
            user: listing.user
              ? { ...listing.user, phone: null }
              : listing.user,
          };

      // ADDED (Trust & Safety Prompt 6): trustScore + badges attached to
      // `user` here, computed fresh on every non-cached call — see
      // TrustProfileService's header for why FraudScore.overallRisk itself
      // is deliberately NOT anywhere in this object, only the single
      // rolled-up 0-100 number. Cached alongside the rest of `finalResult`
      // below (same 2-minute CACHE_TTL_DETAIL as everything else on this
      // response — trust score doesn't need tighter freshness than that).
      const finalResult = result.user
        ? {
            ...result,
            user: {
              ...result.user,
              ...(await this.trustProfile.getTrustProfile(result.user.id, !!result.user.identityVerifiedAt)),
            },
          }
        : result;

      // Only cache ACTIVE listings — non-ACTIVE results must not be served
      // to unauthenticated callers after a future status change to ACTIVE.
      if (listing.status === 'ACTIVE') {
        await this.cache.set(cacheKey, finalResult, CACHE_TTL_DETAIL);
      }

      // Batch view increment — buffered in Redis, flushed to DB by ViewFlushTask
      await this.cache.incrBy(`views:${id}`, 1);

      return finalResult;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to fetch listing ${id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // ── create ────────────────────────────────────────────────────────────────
  async create(data: CreateListingDto & { userId: string }) {
    if (!data.userId) throw new BadRequestException('userId is required');

    try {
      const {
        images,
        userId,
        condition,
        accessorySpec,
        vehicleSpec: vehicleSpecInput,
        sparePartSpec: _sparePartSpec,
        city:             _city,
        district:         _district,
        contactPhone:     _contactPhone,
        contactWhatsapp:  _contactWhatsapp,
        vehicleSpecId: _vsId,
        ...listingData
      } = data as any;

      // Feature: 360° Photo Set — images may arrive as plain strings (legacy)
      // or { url, tag } objects (from the DTO's normalization Transform).
      const normalizedImages: { url: string; tag: string }[] | undefined = images?.length
        ? images.map((img: string | { url: string; tag?: string }) =>
            typeof img === 'string'
              ? { url: img, tag: 'standard' }
              : { url: img.url, tag: img.tag ?? 'standard' },
          )
        : undefined;

      const listingType = listingData.type as ListingType;
      const isVehicle   = VEHICLE_TYPES.has(listingType);
      const isAccessory = ACCESSORY_TYPES.has(listingType);

      // Build vehicleSpec create payload from vehicleSpecInput or condition
      const vehicleSpecCreate = isVehicle
        ? {
            ...(vehicleSpecInput?.year         ? { year:         vehicleSpecInput.year }         : {}),
            ...(vehicleSpecInput?.mileage       ? { mileageKm:    vehicleSpecInput.mileage }      : {}),
            ...(vehicleSpecInput?.color         ? { color:        vehicleSpecInput.color }         : {}),
            ...(vehicleSpecInput?.fuelType      ? { fuelType:     vehicleSpecInput.fuelType }      : {}),
            ...(vehicleSpecInput?.transmission  ? { transmission: vehicleSpecInput.transmission }  : {}),
            ...(vehicleSpecInput?.engineCC      ? { engineCC:     vehicleSpecInput.engineCC }      : {}),
            ...(vehicleSpecInput?.doors         ? { doors:        vehicleSpecInput.doors }         : {}),
            ...(vehicleSpecInput?.bodyType      ? { bodyType:     vehicleSpecInput.bodyType }      : {}),
            ...(vehicleSpecInput?.driveType     ? { drivetrain:   toDrivetrainEnum(vehicleSpecInput.driveType) } : {}),
            ...(condition                       ? { condition }                                    : {}),
          }
        : null;

      const listing = await this.prisma.listing.create({
        data: {
          ...listingData,
          user: { connect: { id: userId } },

          // Vehicle spec: only for CAR / MOTORCYCLE / SPARE_PART
          ...(isVehicle && vehicleSpecCreate && Object.keys(vehicleSpecCreate).length > 0
            ? { vehicleSpec: { create: vehicleSpecCreate } }
            : isVehicle && condition
            ? { vehicleSpec: { create: { condition } } }
            : {}),

          // Feature 3 — Accessory/Service spec: only for ACCESSORY / SERVICE
          ...(isAccessory && accessorySpec
            ? {
                accessorySpec: {
                  create: {
                    brand:            accessorySpec.brand            ?? null,
                    model:            accessorySpec.model            ?? null,
                    condition:        accessorySpec.condition        ?? null,
                    material:         accessorySpec.material         ?? null,
                    color:            accessorySpec.color            ?? null,
                    weight:           accessorySpec.weight           ?? null,
                    dimensions:       accessorySpec.dimensions       ?? null,
                    serviceType:      accessorySpec.serviceType      ?? null,
                    duration:         accessorySpec.duration         ?? null,
                    mobile:           accessorySpec.mobile           ?? false,
                    warranty:         accessorySpec.warranty         ?? null,
                    certifications:   accessorySpec.certifications   ?? [],
                    availableDays:    accessorySpec.availableDays    ?? [],
                    compatibleBrands: accessorySpec.compatibleBrands ?? [],
                    compatibleModels: accessorySpec.compatibleModels ?? [],
                  },
                },
              }
            : {}),

          ...(normalizedImages?.length
            ? {
                images: {
                  create: normalizedImages.map((img, index) => ({
                    url:     img.url,
                    tag:     img.tag,
                    isCover: index === 0,
                    order:   index,
                  })),
                },
              }
            : {}),

          // ADDED (Phase 2 / Prompt 2.2): dual-write into ListingTranslation
          // in the same create() call — atomic with the legacy columns above,
          // so the two can never go out of sync on a partial failure.
          translations: { create: buildTranslationRows(listingData) },
        },
        include: {
          images:       { orderBy: { order: 'asc' } },
          vehicleSpec:  true,
          accessorySpec: true,
          location:     true,
        },
      });

      // F-PERF fix: no longer calling invalidateListCache() here. That method
      // did a full-keyspace Redis SCAN (cache.service.ts's del() prefix
      // branch) on every single create/update/delete — Redis is
      // single-threaded, so this blocked other commands while it ran, and
      // got worse as the number of distinct cached filter-permutation keys
      // grew. TTL-based expiry (CACHE_TTL_LIST, 30s) now replaces write-time
      // invalidation: a listing appearing/disappearing from a browse page
      // for up to 30s after a write is acceptable for this marketplace, and
      // is already the effective staleness window between any two cache
      // refreshes today regardless.
      this.ai.checkContent(
        listing.titleKu ?? listing.titleEn,
        listing.descriptionKu ?? listing.descriptionEn ?? '',
      ).then(async (check) => {
        if (check.shouldQuarantine) {
          this.logger.warn(
            `Listing ${listing.id} quarantined — spam:${check.spamResult.isSpam} flagged:${check.flaggedCategories.join(',')}`,
          );
          await this.prisma.listing.update({
            where: { id: listing.id },
            data:  { status: 'UNDER_REVIEW' },
          }).catch(() => {});

          // Search Architecture Phase 1: status changed (ACTIVE → UNDER_REVIEW)
          // after the initial create() indexing signal already fired via
          // ListingCreatedEvent — re-index so the quarantined listing drops
          // out of search results. Fire-and-forget, same as every other
          // event emit in this file.
          try {
            this.eventEmitter.emit(
              'listing.updated',
              new ListingUpdatedEvent(listing.id, data.userId, null),
            );
          } catch {
            // Best-effort — never block the moderation flow on this.
          }

          await this.auditLog.log({
            action:     AuditAction.LISTING_QUARANTINED,
            actorId:    data.userId,
            targetId:   listing.id,
            targetType: 'Listing',
            metadata: {
              spamScore:         check.spamResult.score,
              spamReasons:       check.spamResult.reasons,
              flaggedCategories: check.flaggedCategories,
            },
          }).catch(() => {});
        }
      }).catch((err: Error) => {
        this.logger.warn(`Content moderation failed for listing ${listing.id}: ${err.message}`);
      });

      // ── Auto-translate (background BullMQ job) ────────────────────────────
      const needsTranslation =
        !listing.titleEn ||
        listing.titleEn === listing.titleKu ||
        listing.titleEn.trim() === '';

      if (needsTranslation) {
        this.translation.queueTranslation(
          listing.id,
          listing.titleKu ?? '',
          listing.descriptionKu ?? '',
        ).catch((err: Error) => {
          this.logger.warn(`Failed to queue translation for listing ${listing.id}: ${err.message}`);
        });
      }

      // ── FEATURE 9: Notify dealer followers of new listing ─────────────────
      // F-ARCH fix: was a direct `this.dealers.notifyFollowersOfNewListing(...)`
      // call — now an emitted event. DealerListeners (in the dealers module)
      // reacts to it the same way (same fire-and-forget semantics), but
      // ListingsService no longer needs to know DealersService exists.
      //
      // The ACTIVE-only / private-seller-skip gating stays HERE (not moved
      // into the listener) because ListingCreatedEvent's payload has no
      // status field — keeping the gate at the emit site preserves the
      // exact original behaviour without the listener needing a second
      // DB round-trip just to re-derive a status it should never have had
      // to ask about.
      if (listing.status === 'ACTIVE') {
        try {
          const dealer = await this.prisma.dealer.findUnique({
            where: { userId: data.userId },
            select: { id: true },
          });
          if (dealer) {
            this.eventEmitter.emit(
              'listing.created',
              new ListingCreatedEvent(listing.id, data.userId, dealer.id, listing.type),
            );
          }
        } catch {
          // Dealer lookup is best-effort — never block listing creation on it.
        }
      }

      // ADDED (Trust & Safety Prompt 3): unconditional — see ListingSavedEvent's
      // doc comment (common/events/listing.events.ts) for why this is a
      // separate event from ListingCreatedEvent above rather than reusing it.
      // Fire-and-forget, same contract as every other listener on these events.
      this.eventEmitter.emit('listing.saved', new ListingSavedEvent(listing.id, data.userId));

      return listing;
    } catch (err) {
      this.logger.error(`Failed to create listing: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // ── myListings ─────────────────────────────────────────────────────────────
  async myListings(userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    try {
      return await this.prisma.listing.findMany({
        where:   { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          type:      true,
          status:    true,
          titleKu:   true,
          titleEn:   true,
          price:     true,
          createdAt: true,
          views:     true,
          featured:  true,
          images: {
            where:  { isCover: true },
            take:   1,
            select: { url: true },
          },
          vehicleSpec: {
            select: {
              year: true, mileageKm: true, condition: true,
              brand: { select: { nameEn: true, nameKu: true, logoUrl: true } },
              model: { select: { nameEn: true, nameKu: true } },
            },
          },
          // Feature 3: include accessory/service info in my listings
          accessorySpec: {
            select: {
              serviceType: true, mobile: true, condition: true,
              brand: true, model: true,
            },
          },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to fetch user listings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // ── update ─────────────────────────────────────────────────────────────────
  async update(id: string, userId: string, data: Partial<CreateListingDto>) {
    if (!id || !userId) throw new BadRequestException('Listing ID and user ID are required');
    try {
      const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
      if (!listing) throw new NotFoundException('Listing not found');

      const { accessorySpec, ...rest } = data as any;
      const wasAlreadySold = listing.status === 'SOLD';
      const translationRows = buildTranslationRows(rest);

      // ADDED (Phase 2 / Prompt 2.2): wrap the legacy-column update and the
      // ListingTranslation upserts in one transaction, so a partial update
      // (e.g. only titleEn was sent) can never leave the two representations
      // out of sync if one write succeeds and the other fails.
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.listing.update({
          where: { id },
          data: {
            ...rest,
            // Feature 3: upsert accessory spec if provided
            ...(accessorySpec
              ? {
                  accessorySpec: {
                    upsert: {
                      create: accessorySpec,
                      update: accessorySpec,
                    },
                  },
                }
              : {}),
          },
          include: { accessorySpec: true, vehicleSpec: true },
        });

        for (const row of translationRows) {
          await tx.listingTranslation.upsert({
            where: { listingId_locale: { listingId: id, locale: row.locale } },
            create: { listingId: id, locale: row.locale, title: row.title, description: row.description },
            update: { title: row.title, description: row.description },
          });
        }

        return result;
      });

      await this.cache.del(`listings:detail:${id}`);
      // F-PERF fix: invalidateListCache() removed here — see the comment at
      // the equivalent point in create() above for why (TTL-based expiry
      // replaces write-time SCAN-based invalidation).
      // SOLD (not on every update to an already-sold listing). The dealer
      // lookup mirrors create()'s — best-effort, never blocks the response.
      if (!wasAlreadySold && updated.status === 'SOLD') {
        try {
          const dealer = await this.prisma.dealer.findUnique({
            where: { userId },
            select: { id: true },
          });
          this.eventEmitter.emit(
            'listing.sold',
            new ListingSoldEvent(id, userId, dealer?.id ?? null),
          );
        } catch {
          // Best-effort — never block the update response on this.
        }
      }

      // Search Architecture Phase 1: update() is the single code path that
      // can change any searchable field (title/translations, price, status,
      // vehicleSpec, accessorySpec, locationId) — always emit here so
      // SearchIndexListener re-indexes the listing. Emitted in addition to,
      // not instead of, ListingSoldEvent above (dealer counters and search
      // indexing are two independent concerns reacting to the same write).
      // Fire-and-forget — never blocks the update response.
      try {
        const dealer = await this.prisma.dealer.findUnique({
          where: { userId },
          select: { id: true },
        });
        this.eventEmitter.emit(
          'listing.updated',
          new ListingUpdatedEvent(id, userId, dealer?.id ?? null),
        );
      } catch {
        // Best-effort — never block the update response on this.
      }

      // ADDED (Trust & Safety Prompt 3): unconditional, mirrors the emit
      // added at the end of create() above — same ListingSavedEvent, same
      // single consumer (DuplicateDetectionListener). update() is the only
      // place VIN/title/description/price can change post-creation, so this
      // re-runs all three duplicate-detection tiers on every edit, not just
      // on first save.
      this.eventEmitter.emit('listing.saved', new ListingSavedEvent(id, userId, false));

      return updated;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to update listing ${id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // ── mark sold (Prompt 7 — Price Feedback Loop) ────────────────────────────
  /**
   * GAP FOUND WHILE IMPLEMENTING THIS: update()'s SOLD-transition branch
   * above (ListingSoldEvent, dealer/search listeners) has existed for a
   * while, but PATCH /listings/:id validates against
   * `Partial<CreateListingDto>`, which has NO `status` field — and the
   * global ValidationPipe runs with `whitelist: true` (main.ts). So a
   * client-sent `status: 'SOLD'` in that PATCH body is silently stripped
   * before it ever reaches update() — the SOLD transition path was
   * unreachable from the public API. Rather than widen CreateListingDto to
   * accept an arbitrary status (which would let a PATCH set status to
   * anything, including moderation states like UNDER_REVIEW), this adds
   * ONE narrow, purpose-built entry point that calls update() with a
   * fixed, server-controlled payload — reusing the existing transaction +
   * event-emission logic exactly, per this prompt's instruction not to
   * build a parallel status field.
   *
   * soldAt is ALWAYS set here (new Date()), never accepted from the
   * client — a client-supplied sale date can't be trusted the way a
   * client-supplied sale PRICE can be checked against the listing's own
   * price for plausibility.
   */
  async markSold(id: string, userId: string, soldPrice: number) {
    if (!Number.isFinite(soldPrice) || soldPrice <= 0) {
      throw new BadRequestException('soldPrice must be a positive number');
    }

    return this.update(id, userId, {
      status: 'SOLD',
      soldPrice,
      soldAt: new Date(),
    } as any);
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  async delete(id: string, userId: string): Promise<void> {
    if (!id || !userId) throw new BadRequestException('Listing ID and user ID are required');
    try {
      const listing = await this.prisma.listing.findFirst({ where: { id, deletedAt: null } });
      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.userId !== userId) throw new ForbiddenException('Not authorized');

      // Soft delete — preserves history/audit trail and avoids cascading the
      // hard-delete to images, favorites, chats, and vehicle specs (bug #8).
      await this.prisma.listing.update({
        where: { id },
        data:  { deletedAt: new Date(), status: 'EXPIRED' },
      });
      await this.cache.del(`listings:detail:${id}`);
      // F-PERF fix: invalidateListCache() removed here — see the comment at
      // the equivalent point in create() above for why (TTL-based expiry
      // replaces write-time SCAN-based invalidation).
      // dealer.activeListings/totalListings in response (best-effort,
      // never throws back into this request).
      try {
        const dealer = await this.prisma.dealer.findUnique({
          where: { userId },
          select: { id: true },
        });
        this.eventEmitter.emit('listing.deleted', new ListingDeletedEvent(id, dealer?.id ?? null));
      } catch {
        // Best-effort — never block the delete response on this.
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      this.logger.error(`Failed to delete listing ${id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildListCacheKey(params: Record<string, any>): string {
    const qs = Object.keys(params)
      .sort()
      .filter((k) => params[k] != null && params[k] !== '')
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return `listings:list:${qs}`;
  }

  private buildWhereClause(params: ListingQueryParams): any {
    const where: any = { status: 'ACTIVE', deletedAt: null };

    if (params.type)       where.type       = params.type as any;
    if (params.featured === 'true') where.featured = true;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.locationId) where.locationId = params.locationId;

    // Phase 3 (Search Architecture) — "near me": approximate bounding-box
    // filter on Location.lat/lng, NOT a true circle (that needs either
    // PostGIS or Meilisearch's `_geoRadius`, which the /search/listings
    // path already uses — see meilisearch-search.strategy.ts). A bounding
    // box is a deliberate, low-risk approximation for this endpoint: it
    // can include a few corner-of-the-box listings just outside the
    // requested radius, but never excludes anything genuinely inside it,
    // and needs no new indexes or query complexity here. Revisit if
    // listings just outside the circle but inside the box become a
    // real user complaint.
    if (params.lat && params.lng && params.radiusKm) {
      const lat = Number(params.lat);
      const lng = Number(params.lng);
      const radiusKm = Number(params.radiusKm);
      const latDelta = radiusKm / 111; // ~111km per degree latitude, everywhere
      const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
      where.location = {
        ...(where.location ?? {}),
        is: {
          ...(where.location?.is ?? {}),
          lat: { gte: lat - latDelta, lte: lat + latDelta },
          lng: { gte: lng - lngDelta, lte: lng + lngDelta },
        },
      };
    }

    if (params.search) {
      where.OR = [
        { titleEn: { contains: params.search, mode: 'insensitive' } },
        { titleKu: { contains: params.search, mode: 'insensitive' } },
        { titleAr: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.minPrice || params.maxPrice) {
      const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
      const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
      if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        throw new BadRequestException('minPrice cannot be greater than maxPrice');
      }
      where.price = {
        ...(minPrice ? { gte: minPrice } : {}),
        ...(maxPrice ? { lte: maxPrice } : {}),
      };
    }

    // ── Vehicle spec filters ────────────────────────────────────────────────
    const type = params.type as ListingType | undefined;
    const isVehicleFilter = !type || VEHICLE_TYPES.has(type);

    if (isVehicleFilter) {
      const specWhere: any = {};
      let hasSpecFilter    = false;

      for (const field of ['brandId', 'modelId', 'trimId', 'condition', 'fuelType', 'transmission'] as const) {
        if (params[field]) { specWhere[field] = params[field]; hasSpecFilter = true; }
      }

      if (params.color) {
        specWhere.color = { equals: params.color, mode: 'insensitive' };
        hasSpecFilter   = true;
      }

      if (params.year) {
        specWhere.year = Number(params.year);
        hasSpecFilter  = true;
      } else if (params.minYear || params.maxYear) {
        const minYear = params.minYear ? Number(params.minYear) : undefined;
        const maxYear = params.maxYear ? Number(params.maxYear) : undefined;
        if (minYear !== undefined && maxYear !== undefined && minYear > maxYear) {
          throw new BadRequestException('minYear cannot be greater than maxYear');
        }
        specWhere.year = {
          ...(minYear ? { gte: minYear } : {}),
          ...(maxYear ? { lte: maxYear } : {}),
        };
        hasSpecFilter = true;
      }

      if (params.minMileage || params.maxMileage) {
        const min = params.minMileage ? Number(params.minMileage) : undefined;
        const max = params.maxMileage ? Number(params.maxMileage) : undefined;
        if (min !== undefined && max !== undefined && min > max) {
          throw new BadRequestException('minMileage cannot be greater than maxMileage');
        }
        specWhere.mileageKm = {
          ...(min ? { gte: min } : {}),
          ...(max ? { lte: max } : {}),
        };
        hasSpecFilter = true;
      }

      if (hasSpecFilter) where.vehicleSpec = { is: specWhere };
    }

    // ── Feature 3: Accessory / Service spec filters ─────────────────────────
    const isAccessoryFilter = type && ACCESSORY_TYPES.has(type);
    if (isAccessoryFilter) {
      const accWhere: any = {};
      let hasAccFilter    = false;

      if (params.serviceType) {
        accWhere.serviceType = { equals: params.serviceType, mode: 'insensitive' };
        hasAccFilter = true;
      }

      if (params.mobile !== undefined) {
        accWhere.mobile = params.mobile === 'true';
        hasAccFilter = true;
      }

      if (hasAccFilter) where.accessorySpec = { is: accWhere };
    }

    return where;
  }

  // ── Facet counts (Search Architecture Phase 3) ────────────────────────────
  //
  // Backs GET /listings/facets. Deliberately separate from findAll() above:
  // findAll()'s actual listing data still comes straight from Postgres,
  // completely unchanged by this phase (see search-indexing/README.md's
  // Phase 3 section for why) — this method ONLY answers "how many listings
  // match filters X, broken down by each facet field", which the frontend
  // filter sidebar calls in parallel with its normal findAll() list request
  // to annotate each filter checkbox with a live count.
  //
  // Powered by Meilisearch (same index Phase 1/2 already built) rather than
  // N separate Postgres COUNT(*)...GROUP BY queries — Meilisearch computes
  // every facet's distribution in a single request. Never throws: returns
  // an empty object on any Meilisearch error/timeout so the sidebar simply
  // renders without counts rather than failing the page.
  async getFacets(params: ListingQueryParams): Promise<Record<string, { value: string; count: number }[]>> {
    try {
      return await this.meilisearchStrategy.facetCounts({
        type: params.type,
        brandId: params.brandId,
        modelId: params.modelId,
        year: params.year ? Number(params.year) : undefined,
        minYear: params.minYear ? Number(params.minYear) : undefined,
        maxYear: params.maxYear ? Number(params.maxYear) : undefined,
        fuelType: params.fuelType,
        transmission: params.transmission,
        condition: params.condition,
        minPrice: params.minPrice ? Number(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
      });
    } catch (err) {
      this.logger.warn(`getFacets() failed — returning empty facets: ${err instanceof Error ? err.message : 'unknown error'}`);
      return {};
    }
  }
}
