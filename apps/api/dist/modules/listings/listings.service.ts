// apps/api/src/modules/listings/listings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  // ── Browse / filter listings ───────────────────────────────────────────────
  async findAll(query: {
    type?: string;
    makeId?: string;
    modelId?: string;
    yearFrom?: string;
    yearTo?: string;
    trim?: string;
    bodyType?: string;
    fuelType?: string;
    transmission?: string;
    driveType?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    minMileage?: string;
    maxMileage?: string;
    locationId?: string;
    color?: string;
    page?: string;
    limit?: string;
  }) {
    const page  = Number(query.page  ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip  = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };

    if (query.type)         where.type         = query.type;
    if (query.makeId)       where.makeId        = query.makeId;
    if (query.modelId)      where.modelId       = query.modelId;
    if (query.trim)         where.trim          = { equals: query.trim, mode: 'insensitive' };
    if (query.bodyType)     where.bodyType      = query.bodyType;
    if (query.fuelType)     where.fuelType      = query.fuelType;
    if (query.transmission) where.transmission  = query.transmission;
    if (query.driveType)    where.driveType     = query.driveType;
    if (query.condition)    where.condition     = query.condition;
    if (query.locationId)   where.locationId    = query.locationId;
    if (query.color)        where.color         = { contains: query.color, mode: 'insensitive' };

    if (query.yearFrom || query.yearTo) {
      where.year = {};
      if (query.yearFrom) where.year.gte = Number(query.yearFrom);
      if (query.yearTo)   where.year.lte = Number(query.yearTo);
    }
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = Number(query.minPrice);
      if (query.maxPrice) where.price.lte = Number(query.maxPrice);
    }
    if (query.minMileage || query.maxMileage) {
      where.mileage = {};
      if (query.minMileage) where.mileage.gte = Number(query.minMileage);
      if (query.maxMileage) where.mileage.lte = Number(query.maxMileage);
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: {
          images:   { where: { isCover: true }, take: 1 },
          location: true,
          carMake:  { select: { id: true, nameEn: true, nameKu: true, nameAr: true, logoUrl: true } },
          carModel: { select: { id: true, name: true, bodyType: true } },
          user:     { select: { id: true, name: true, avatar: true, verified: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Single listing ────────────────────────────────────────────────────────
  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images:   true,
        location: true,
        carMake:  true,
        carModel: true,
        user:     { select: { id: true, name: true, avatar: true, verified: true, phone: true } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    await this.prisma.listing.update({
      where: { id },
      data:  { views: { increment: 1 } },
    });

    return listing;
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async create(data: CreateListingDto & { userId: string }) {
    const { userId, ...rest } = data;
    return this.prisma.listing.create({
      data: { ...rest, user: { connect: { id: userId } } } as any,
    });
  }

  // ── My listings ───────────────────────────────────────────────────────────
  async myListings(userId: string) {
    return this.prisma.listing.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images:   { where: { isCover: true }, take: 1 },
        carMake:  { select: { nameEn: true, nameKu: true, logoUrl: true } },
        carModel: { select: { name: true } },
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async delete(id: string, userId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.listing.delete({ where: { id } });
  }

  // ── Dropdown helpers (brand → model → year → trim cascade) ────────────────

  async getMakes() {
    return this.prisma.carMake.findMany({
      orderBy: { nameEn: 'asc' },
      select: {
        id: true,
        nameEn: true, nameKu: true, nameAr: true, nameZh: true,
        logoUrl: true, country: true,
      },
    });
  }

  async getModelsByMake(makeId: string) {
    return this.prisma.carModel.findMany({
      where:   { makeId },
      orderBy: { name: 'asc' },
      select:  { id: true, name: true, bodyType: true, years: true },
    });
  }

  async getTrimsByModel(modelId: string, year?: number) {
    // Returns distinct trim strings already used for this model/year combo.
    const rows = await this.prisma.listing.findMany({
      where:    { modelId, status: 'ACTIVE', ...(year ? { year } : {}), trim: { not: null } },
      distinct: ['trim'],
      select:   { trim: true },
      orderBy:  { trim: 'asc' },
    });
    return rows.map((r) => r.trim).filter(Boolean);
  }
}
