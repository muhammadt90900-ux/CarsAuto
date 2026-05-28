// apps/api/src/modules/listings/listings.service.ts
// Optimised: list pages cached 30 s, single listing cached 60 s.
// Cache is invalidated on create/update/delete.

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { Prisma } from '@prisma/client';

// Shared include shape used for list responses (lighter than detail)
const LIST_INCLUDE = {
  images:   { where: { isCover: true }, take: 1, orderBy: { order: 'asc' } },
  location: true,
  user:     { select: { id: true, name: true, avatar: true, verified: true } },
  vehicleSpec: {
    include: {
      brand: { select: { id: true, name: true, name: true, name: true, logoUrl: true } },
      model: { select: { id: true, name: true, name: true, name: true } },
      trim:  { select: { id: true, name: true, fuelType: true, transmission: true, bodyType: true, engineLabel: true } },
    },
  },
} satisfies Prisma.ListingInclude;

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // ── Build a deterministic cache key from filter params ─────────────────────
  private listKey(query: Record<string, any>): string {
    const sorted = Object.keys(query).sort().map(k => `${k}=${query[k]}`).join('&');
    return `listings:list:${sorted}`;
  }

  async findAll(query: {
    type?: string; minPrice?: string; maxPrice?: string; locationId?: string;
    brandId?: string; modelId?: string; trimId?: string; year?: string;
    minYear?: string; maxYear?: string; condition?: string; fuelType?: string;
    transmission?: string; color?: string; minMileage?: string; maxMileage?: string;
    page?: string; limit?: string;
  }) {
    const cacheKey = this.listKey(query);
    return this.cache.getOrSet(cacheKey, async () => {
      const page  = Math.max(1, Number(query.page  ?? 1));
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
      const skip  = (page - 1) * limit;

      const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };

      if (query.type)       where.type       = query.type as any;
      if (query.locationId) where.locationId = query.locationId;

      if (query.minPrice || query.maxPrice) {
        where.price = {};
        if (query.minPrice) (where.price as any).gte = Number(query.minPrice);
        if (query.maxPrice) (where.price as any).lte = Number(query.maxPrice);
      }

      const specWhere: Prisma.ListingVehicleSpecWhereInput = {};
      let hasSpecFilter = false;

      if (query.brandId)    { specWhere.brandId    = query.brandId;            hasSpecFilter = true; }
      if (query.modelId)    { specWhere.modelId    = query.modelId;            hasSpecFilter = true; }
      if (query.trimId)     { specWhere.trimId     = query.trimId;             hasSpecFilter = true; }
      if (query.condition)  { specWhere.condition  = query.condition  as any;  hasSpecFilter = true; }
      if (query.fuelType)   { specWhere.fuelType   = query.fuelType   as any;  hasSpecFilter = true; }
      if (query.transmission){ specWhere.transmission = query.transmission as any; hasSpecFilter = true; }
      if (query.color)      { specWhere.color = { equals: query.color, mode: 'insensitive' }; hasSpecFilter = true; }

      if (query.year) {
        specWhere.year = Number(query.year); hasSpecFilter = true;
      } else if (query.minYear || query.maxYear) {
        specWhere.year = {};
        if (query.minYear) (specWhere.year as any).gte = Number(query.minYear);
        if (query.maxYear) (specWhere.year as any).lte = Number(query.maxYear);
        hasSpecFilter = true;
      }

      if (query.minMileage || query.maxMileage) {
        specWhere.mileageKm = {};
        if (query.minMileage) (specWhere.mileageKm as any).gte = Number(query.minMileage);
        if (query.maxMileage) (specWhere.mileageKm as any).lte = Number(query.maxMileage);
        hasSpecFilter = true;
      }

      if (hasSpecFilter) where.vehicleSpec = { is: specWhere };

      const [data, total] = await Promise.all([
        this.prisma.listing.findMany({
          where, skip, take: limit,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          include: LIST_INCLUDE,
        }),
        this.prisma.listing.count({ where }),
      ]);

      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }, 30_000); // 30 s
  }

  async findOne(id: string) {
    const key = `listings:detail:${id}`;
    const result = await this.cache.getOrSet(key, async () => {
      const listing = await this.prisma.listing.findUnique({
        where: { id },
        include: {
          images:   { orderBy: { order: 'asc' } },
          location: true,
          user:     { select: { id: true, name: true, avatar: true, verified: true, phone: true } },
          vehicleSpec: {
            include: {
              brand: { select: { id: true, name: true, name: true, name: true, logoUrl: true } },
              model: { select: { id: true, name: true, name: true, name: true } },
              trim: {
                select: {
                  id: true, name: true, fuelType: true, transmission: true,
                  bodyType: true, drivetrain: true, engineCC: true,
                  engineLabel: true, powerKw: true, doors: true, seats: true,
                },
              },
            },
          },
        },
      });
      if (!listing) return null;
      return listing;
    }, 60_000); // 60 s

    if (!result) throw new NotFoundException('Listing not found');

    // Increment view count fire-and-forget
    this.prisma.listing
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    return result;
  }

  async create(data: CreateListingDto & { userId: string }) {
    const { images, userId, ...rest } = data as any;

    const listing = await this.prisma.listing.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
        ...(images?.length
          ? {
              images: {
                create: images.map((url: string, i: number) => ({
                  url, isCover: i === 0, order: i,
                })),
              },
            }
          : {}),
      },
      include: {
        images:      { orderBy: { order: 'asc' } },
        vehicleSpec: true,
        location:    true,
      },
    });

    // Bust list cache on any write
    this.cache.del('listings:list:');
    return listing;
  }

  async myListings(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { isCover: true }, take: 1 },
        vehicleSpec: {
          include: {
            brand: { select: { id: true, name: true, logoUrl: true } },
            model: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async update(id: string, userId: string, data: Partial<CreateListingDto>) {
    const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const updated = await this.prisma.listing.update({
      where: { id },
      data: { ...data } as any,
    });

    this.cache.del(`listings:detail:${id}`);
    this.cache.del('listings:list:');
    return updated;
  }

  async delete(id: string, userId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenException('Not authorized');

    const deleted = await this.prisma.listing.delete({ where: { id } });
    this.cache.del(`listings:detail:${id}`);
    this.cache.del('listings:list:');
    return deleted;
  }
}
