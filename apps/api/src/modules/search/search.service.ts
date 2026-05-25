// apps/api/src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(
    q: string,
    options: {
      type?: string;
      brandId?: string;
      modelId?: string;
      trimId?: string;
      year?: string;
      minYear?: string;
      maxYear?: string;
      condition?: string;
      minPrice?: string;
      maxPrice?: string;
      locationId?: string;
      fuelType?: string;
      transmission?: string;
      color?: string;
      minMileage?: string;
      maxMileage?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 20, ...filters } = options;
    const skip = (page - 1) * limit;

    // ── Base where clause ────────────────────────────────────────────────────
    const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };

    // ── Full-text search across all localised title/description fields ───────
    if (q?.trim()) {
      where.OR = [
        { titleKu:       { contains: q.trim(), mode: 'insensitive' } },
        { titleAr:       { contains: q.trim(), mode: 'insensitive' } },
        { titleEn:       { contains: q.trim(), mode: 'insensitive' } },
        { titleZh:       { contains: q.trim(), mode: 'insensitive' } },
        { descriptionKu: { contains: q.trim(), mode: 'insensitive' } },
        { descriptionAr: { contains: q.trim(), mode: 'insensitive' } },
        { descriptionEn: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    // ── Listing-level filters ────────────────────────────────────────────────
    if (filters.type)       where.type       = filters.type as any;
    if (filters.locationId) where.locationId = filters.locationId;

    // ── Price range ──────────────────────────────────────────────────────────
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) (where.price as any).gte = Number(filters.minPrice);
      if (filters.maxPrice) (where.price as any).lte = Number(filters.maxPrice);
    }

    // ── Vehicle spec filters (nested into vehicleSpec relation) ──────────────
    const specWhere: Prisma.ListingVehicleSpecWhereInput = {};
    let hasSpecFilter = false;

    if (filters.brandId)    { specWhere.brandId    = filters.brandId;             hasSpecFilter = true; }
    if (filters.modelId)    { specWhere.modelId    = filters.modelId;             hasSpecFilter = true; }
    if (filters.trimId)     { specWhere.trimId     = filters.trimId;              hasSpecFilter = true; }
    if (filters.condition)  { specWhere.condition  = filters.condition  as any;   hasSpecFilter = true; }
    if (filters.fuelType)   { specWhere.fuelType   = filters.fuelType   as any;   hasSpecFilter = true; }
    if (filters.transmission){ specWhere.transmission = filters.transmission as any; hasSpecFilter = true; }
    if (filters.color)      { specWhere.color = { equals: filters.color, mode: 'insensitive' }; hasSpecFilter = true; }

    // Year
    if (filters.year) {
      specWhere.year = Number(filters.year);
      hasSpecFilter = true;
    } else if (filters.minYear || filters.maxYear) {
      specWhere.year = {};
      if (filters.minYear) (specWhere.year as any).gte = Number(filters.minYear);
      if (filters.maxYear) (specWhere.year as any).lte = Number(filters.maxYear);
      hasSpecFilter = true;
    }

    // Mileage
    if (filters.minMileage || filters.maxMileage) {
      specWhere.mileageKm = {};
      if (filters.minMileage) (specWhere.mileageKm as any).gte = Number(filters.minMileage);
      if (filters.maxMileage) (specWhere.mileageKm as any).lte = Number(filters.maxMileage);
      hasSpecFilter = true;
    }

    if (hasSpecFilter) {
      where.vehicleSpec = { is: specWhere };
    }

    // ── Execute ──────────────────────────────────────────────────────────────
    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: {
          images:   { where: { isCover: true }, take: 1 },
          location: true,
          vehicleSpec: {
            include: {
              brand: { select: { id: true, nameEn: true, nameAr: true, nameKu: true, logoUrl: true } },
              model: { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
              trim:  { select: { id: true, name: true, fuelType: true, transmission: true, bodyType: true, engineLabel: true } },
            },
          },
        },
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
  }

  // ── Autocomplete suggestions ─────────────────────────────────────────────
  async autocomplete(q: string, limit = 6): Promise<string[]> {
    if (!q || q.trim().length < 2) return [];

    const listings = await this.prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { titleEn: { contains: q.trim(), mode: 'insensitive' } },
          { titleKu: { contains: q.trim(), mode: 'insensitive' } },
          { titleAr: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: { titleEn: true, titleKu: true },
      distinct: ['titleEn'],
      take: limit,
    });

    return listings.map((l) => l.titleEn || l.titleKu);
  }
}
