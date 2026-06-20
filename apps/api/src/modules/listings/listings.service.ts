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
import { DealersService } from '../dealers/dealers.service';

// ── Constants ─────────────────────────────────────────────────────────────────
const CACHE_TTL_LIST   = 30_000;        // 30 s  — list pages
const CACHE_TTL_DETAIL = 2 * 60_000;   // 2 min — detail pages
const MAX_PAGE_LIMIT     = 100;
const DEFAULT_PAGE_LIMIT = 20;

// ── View counter (batched DB writes every 30 s) ───────────────────────────────
const viewBuffer = new Map<string, number>();
let viewFlushTimer: NodeJS.Timeout | null = null;

function scheduleViewFlush(prisma: PrismaService): void {
  if (viewFlushTimer) return;
  viewFlushTimer = setTimeout(async () => {
    viewFlushTimer = null;
    if (viewBuffer.size === 0) return;
    const snapshot = new Map(viewBuffer);
    viewBuffer.clear();
    await Promise.all(
      [...snapshot.entries()].map(([id, count]) =>
        prisma.listing
          .update({ where: { id }, data: { views: { increment: count } } })
          .catch(() => {/* listing may have been deleted */}),
      ),
    );
  }, 30_000);
}

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
  featured?:     string;
  search?:       string;
  sortBy?:       string;
  sortOrder?:    string;
  categoryId?:   string;
  // Feature 3 — accessory/service filters
  serviceType?:  string;
  mobile?:       string;
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
    private readonly dealers:      DealersService,
  ) {}

  // ── Pagination helper ──────────────────────────────────────────────────────
  private validatePagination(page?: string, limit?: string) {
    const validPage  = Math.max(1, Number(page)  || 1);
    const validLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT));
    return { page: validPage, limit: validLimit };
  }

  // ── findAll ────────────────────────────────────────────────────────────────
  async findAll(params: ListingQueryParams, userId?: string) {
    // userId is optional — public (unauthenticated) requests omit it entirely.
    // The cache key intentionally excludes userId so public results are shared;
    // isFavorited is appended in a second pass after the cached fetch.
    const cacheKey = this.buildListCacheKey(params);
    try {
      const base = await this.cache.getOrSet(
        cacheKey,
        async () => {
          const { page, limit } = this.validatePagination(params.page, params.limit);
          const skip  = (page - 1) * limit;
          const where = this.buildWhereClause(params);

          const [data, total] = await Promise.all([
            this.prisma.listing.findMany({
              where,
              skip,
              take:    limit,
              orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
              select:  LIST_SELECT,
            }),
            this.prisma.listing.count({ where }),
          ]);

          return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
        },
        CACHE_TTL_LIST,
      );

      // ── isFavorited pass (only for authenticated users) ──────────────────
      // Runs outside the cache so each user gets their own favorite flags
      // without polluting the shared public cache.
      if (userId && base.data.length > 0) {
        const listingIds = base.data.map((l: any) => l.id);
        const favorites  = await this.prisma.favorite.findMany({
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
      // F3 FIX: fetch without cache first so we can check ownership/status
      // before deciding whether to return or cache the result.
      const listing = await this.prisma.listing.findFirst({
        where:   { id, deletedAt: null },
        include: {
          images:   { orderBy: { order: 'asc' } },
          location: true,
          user: {
            select: { id: true, name: true, avatar: true, verified: true, phone: true },
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

      // Only cache ACTIVE listings — non-ACTIVE results must not be served
      // to unauthenticated callers after a future status change to ACTIVE.
      if (listing.status === 'ACTIVE') {
        await this.cache.set(cacheKey, result, CACHE_TTL_DETAIL);
      }

      // Batch view increment
      viewBuffer.set(id, (viewBuffer.get(id) ?? 0) + 1);
      scheduleViewFlush(this.prisma);

      return result;
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
        vehicleSpecId: _vsId,
        ...listingData
      } = data as any;

      const listingType = listingData.type as ListingType;
      const isVehicle   = VEHICLE_TYPES.has(listingType);
      const isAccessory = ACCESSORY_TYPES.has(listingType);

      const listing = await this.prisma.listing.create({
        data: {
          ...listingData,
          user: { connect: { id: userId } },

          // Vehicle spec: only for CAR / MOTORCYCLE / SPARE_PART
          ...(isVehicle && condition
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

          ...(images?.length
            ? {
                images: {
                  create: images.map((url: string, index: number) => ({
                    url,
                    isCover: index === 0,
                    order:   index,
                  })),
                },
              }
            : {}),
        },
        include: {
          images:       { orderBy: { order: 'asc' } },
          vehicleSpec:  true,
          accessorySpec: true,
          location:     true,
        },
      });

      this.invalidateListCache();

      // ── AI content moderation (fire-and-forget) ───────────────────────────
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
      // Fire-and-forget — never blocks the HTTP response.
      // Only fires for listings that go live immediately (ACTIVE).
      // Quarantined listings (UNDER_REVIEW) are silently skipped.
      // Private sellers (no Dealer row) are also silently skipped.
      if (listing.status === 'ACTIVE') {
        this.prisma.dealer
          .findUnique({ where: { userId: data.userId }, select: { id: true } })
          .then((dealer: { id: string } | null) => {
            if (!dealer) return;
            const title = listing.titleKu ?? listing.titleEn ?? '';
            this.dealers
              .notifyFollowersOfNewListing(dealer.id, listing.id, title)
              .catch((err: Error) => {
                this.logger.warn(
                  `Failed to notify followers for listing ${listing.id}: ${err.message}`,
                );
              });
          })
          .catch(() => {});
      }

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

      const updated = await this.prisma.listing.update({
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

      this.cache.del(`listings:detail:${id}`);
      this.invalidateListCache();
      return updated;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to update listing ${id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
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
      this.cache.del(`listings:detail:${id}`);
      this.invalidateListCache();
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

  private invalidateListCache(): void {
    this.cache.del('listings:list:');
  }
}
