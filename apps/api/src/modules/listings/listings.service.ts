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
import { Prisma } from '@prisma/client';

// IMPROVE: Extracted cache TTL constants
const CACHE_TTL_LIST = 30_000; // 30 s  — list pages
const CACHE_TTL_DETAIL = 2 * 60_000; // 2 min — detail pages
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

// IMPROVE: View counter — batched DB writes every 30 s to avoid thrashing
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
          .catch(() => {
            /* listing may have been deleted — ignore */
          }),
      ),
    );
  }, 30_000);
}

// IMPROVE: Lean select for list pages (excludes description blobs)
const LIST_SELECT = {
  id: true,
  type: true,
  status: true,
  titleKu: true,
  titleAr: true,
  titleEn: true,
  price: true,
  currency: true,
  negotiable: true,
  featured: true,
  views: true,
  createdAt: true,
  images: {
    where: { isCover: true },
    take: 1,
    orderBy: { order: 'asc' as const },
    select: { url: true, id: true },
  },
  location: {
    select: { id: true, city: true, governorate: true, nameKu: true, nameEn: true },
  },
  user: {
    select: { id: true, name: true, avatar: true, verified: true },
  },
  vehicleSpec: {
    select: {
      year: true,
      mileageKm: true,
      fuelType: true,
      transmission: true,
      bodyType: true,
      condition: true,
      color: true,
      brand: { select: { id: true, nameEn: true, nameKu: true, logoUrl: true } },
      model: { select: { id: true, nameEn: true, nameKu: true } },
      trim: { select: { name: true, engineLabel: true } },
    },
  },
} satisfies Prisma.ListingSelect;

export interface ListingQueryParams {
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  locationId?: string;
  brandId?: string;
  modelId?: string;
  trimId?: string;
  year?: string;
  minYear?: string;
  maxYear?: string;
  condition?: string;
  fuelType?: string;
  transmission?: string;
  color?: string;
  minMileage?: string;
  maxMileage?: string;
  page?: string;
  limit?: string;
  featured?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  categoryId?: string;
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // IMPROVE: Added validation helper
  private validatePagination(page?: string, limit?: string) {
    const validPage = Math.max(1, Number(page) || 1);
    const validLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT));
    return { page: validPage, limit: validLimit };
  }

  async findAll(params: ListingQueryParams) {
    const cacheKey = this.buildListCacheKey(params);

    try {
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const { page, limit } = this.validatePagination(params.page, params.limit);
          const skip = (page - 1) * limit;

          const where = this.buildWhereClause(params);

          const [data, total] = await Promise.all([
            this.prisma.listing.findMany({
              where,
              skip,
              take: limit,
              orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
              select: LIST_SELECT,
            }),
            this.prisma.listing.count({ where }),
          ]);

          return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          };
        },
        CACHE_TTL_LIST,
      );
    } catch (err) {
      this.logger.error(`Failed to fetch listings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async findOne(id: string) {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid listing ID');
    }

    const cacheKey = `listings:detail:${id}`;

    try {
      const result = await this.cache.getOrSet(
        cacheKey,
        async () => {
          const listing = await this.prisma.listing.findUnique({
            where: { id },
            include: {
              images: { orderBy: { order: 'asc' } },
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
                      id: true,
                      name: true,
                      fuelType: true,
                      transmission: true,
                      bodyType: true,
                      drivetrain: true,
                      engineCC: true,
                      engineLabel: true,
                      powerKw: true,
                      doors: true,
                      seats: true,
                    },
                  },
                },
              },
            },
          });
          return listing ?? null;
        },
        CACHE_TTL_DETAIL,
      );

      if (!result) throw new NotFoundException('Listing not found');

      // IMPROVE: Batch view increment — no per-request DB write
      viewBuffer.set(id, (viewBuffer.get(id) ?? 0) + 1);
      scheduleViewFlush(this.prisma);

      return result;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Failed to fetch listing ${id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async create(data: CreateListingDto & { userId: string }) {
    if (!data.userId) {
      throw new BadRequestException('userId is required');
    }

    try {
      const { images, userId, ...listingData } = data as any;

      const listing = await this.prisma.listing.create({
        data: {
          ...listingData,
          user: { connect: { id: userId } },
          ...(images?.length
            ? {
                images: {
                  create: images.map((url: string, index: number) => ({
                    url,
                    isCover: index === 0,
                    order: index,
                  })),
                },
              }
            : {}),
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          vehicleSpec: true,
          location: true,
        },
      });

      this.invalidateListCache();
      return listing;
    } catch (err) {
      this.logger.error(`Failed to create listing: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async myListings(userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    try {
      return await this.prisma.listing.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          titleKu: true,
          titleEn: true,
          price: true,
          createdAt: true,
          views: true,
          featured: true,
          images: {
            where: { isCover: true },
            take: 1,
            select: { url: true },
          },
          vehicleSpec: {
            select: {
              year: true,
              mileageKm: true,
              condition: true,
              brand: { select: { nameEn: true, nameKu: true, logoUrl: true } },
              model: { select: { nameEn: true, nameKu: true } },
            },
          },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to fetch user listings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async update(id: string, userId: string, data: Partial<CreateListingDto>) {
    if (!id || !userId) {
      throw new BadRequestException('Listing ID and user ID are required');
    }

    try {
      const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
      if (!listing) throw new NotFoundException('Listing not found');

      const updated = await this.prisma.listing.update({
        where: { id },
        data: data as any,
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

  async delete(id: string, userId: string): Promise<void> {
    if (!id || !userId) {
      throw new BadRequestException('Listing ID and user ID are required');
    }

    try {
      const listing = await this.prisma.listing.findFirst({ where: { id } });
      if (!listing) throw new NotFoundException('Listing not found');
      if (listing.userId !== userId) throw new ForbiddenException('Not authorized');

      await this.prisma.listing.delete({ where: { id } });
      this.cache.del(`listings:detail:${id}`);
      this.invalidateListCache();
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      this.logger.error(`Failed to delete listing ${id}: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Builds deterministic, sorted cache key from query params
  private buildListCacheKey(params: Record<string, any>): string {
    const qs = Object.keys(params)
      .sort()
      .filter((k) => params[k] != null && params[k] !== '')
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return `listings:list:${qs}`;
  }

  // IMPROVE: Builds type-safe Prisma where clause from query params
  private buildWhereClause(params: ListingQueryParams): Prisma.ListingWhereInput {
    const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };

    if (params.type) where.type = params.type as any;
    if (params.featured === 'true') where.featured = true;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.search) {
      where.OR = [
        { titleEn: { contains: params.search, mode: 'insensitive' } },
        { titleKu: { contains: params.search, mode: 'insensitive' } },
        { titleAr: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.locationId) where.locationId = params.locationId;

    if (params.minPrice || params.maxPrice) {
      const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
      const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;

      // IMPROVE: Validate price range
      if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        throw new BadRequestException('minPrice cannot be greater than maxPrice');
      }

      where.price = {
        ...(minPrice ? { gte: minPrice } : {}),
        ...(maxPrice ? { lte: maxPrice } : {}),
      };
    }

    const specWhere: Prisma.ListingVehicleSpecWhereInput = {};
    let hasSpecFilter = false;

    const directSpecFields = ['brandId', 'modelId', 'trimId', 'condition', 'fuelType', 'transmission'] as const;
    for (const field of directSpecFields) {
      if (params[field]) {
        (specWhere as any)[field] = params[field];
        hasSpecFilter = true;
      }
    }

    if (params.color) {
      specWhere.color = { equals: params.color, mode: 'insensitive' };
      hasSpecFilter = true;
    }

    if (params.year) {
      specWhere.year = Number(params.year);
      hasSpecFilter = true;
    } else if (params.minYear || params.maxYear) {
      const minYear = params.minYear ? Number(params.minYear) : undefined;
      const maxYear = params.maxYear ? Number(params.maxYear) : undefined;

      // IMPROVE: Validate year range
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
      const minMileage = params.minMileage ? Number(params.minMileage) : undefined;
      const maxMileage = params.maxMileage ? Number(params.maxMileage) : undefined;

      // IMPROVE: Validate mileage range
      if (minMileage !== undefined && maxMileage !== undefined && minMileage > maxMileage) {
        throw new BadRequestException('minMileage cannot be greater than maxMileage');
      }

      specWhere.mileageKm = {
        ...(minMileage ? { gte: minMileage } : {}),
        ...(maxMileage ? { lte: maxMileage } : {}),
      };
      hasSpecFilter = true;
    }

    if (hasSpecFilter) where.vehicleSpec = { is: specWhere };

    return where;
  }

  private invalidateListCache(): void {
    this.cache.del('listings:list:');
  }
}
