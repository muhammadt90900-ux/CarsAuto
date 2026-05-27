// apps/api/src/modules/vehicles/vehicles.service.ts
// Optimised: all read paths go through CacheService (5-min TTL for brands/models, 2-min for years)

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { BrandQueryDto, ModelQueryDto, TrimQueryDto } from './dto/vehicle-query.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getBrands({ q }: BrandQueryDto) {
    const key = `vehicles:brands:${q ?? ''}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { isActive: true };
      if (q?.trim()) {
        where.OR = [
          { nameEn: { contains: q.trim(), mode: 'insensitive' } },
          { nameAr: { contains: q.trim(), mode: 'insensitive' } },
          { nameKu: { contains: q.trim(), mode: 'insensitive' } },
        ];
      }
      const brands = await this.prisma.carBrand.findMany({
        where,
        orderBy: { nameEn: 'asc' },
        select: {
          id: true, nameEn: true, nameAr: true, nameKu: true,
          logo: true, slug: true,
          _count: { select: { listingSpecs: { where: { status: 'ACTIVE' } } } },
        },
      });
      return brands.map((b) => ({
        id: b.id, nameEn: b.nameEn, nameAr: b.nameAr, nameKu: b.nameKu,
        logo: b.logo, slug: b.slug, listingCount: b._count.listings,
      }));
    }, 300_000); // 5 min
  }

  async getModelsByBrand(brandId: string, { q }: ModelQueryDto) {
    const key = `vehicles:models:${brandId}:${q ?? ''}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { brandId, active: true };
      if (q?.trim()) {
        where.OR = [
          { nameEn: { contains: q.trim(), mode: 'insensitive' } },
          { nameAr: { contains: q.trim(), mode: 'insensitive' } },
          { nameKu: { contains: q.trim(), mode: 'insensitive' } },
        ];
      }
      const models = await this.prisma.CarModelGeneration.findMany({
        where,
        orderBy: { nameEn: 'asc' },
        select: {
          id: true, nameEn: true, nameAr: true, nameKu: true,
          slug: true, brandId: true, startYear: true, endYear: true,
          _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
        },
      });
      return models.map((m) => ({
        id: m.id, nameEn: m.nameEn, nameAr: m.nameAr, nameKu: m.nameKu,
        slug: m.slug, brandId: m.brandId, startYear: m.startYear, endYear: m.endYear,
        listingCount: m._count.listings,
      }));
    }, 300_000);
  }

  async getTrimsByModelAndYear(modelId: string, { year, q }: TrimQueryDto) {
  const key = `vehicles:trims:${modelId}:${year ?? ''}:${q ?? ''}`;
  return this.cache.getOrSet(key, async () => {
    const yearNum = year ? Number(year) : undefined;
    const where: any = {
      isActive: true,
      generation: {
        modelId,
        ...(yearNum ? {
          yearFrom: { lte: yearNum },
          OR: [{ yearTo: { gte: yearNum } }, { yearTo: null }],
        } : {}),
      },
    };
    if (q?.trim()) where.name = { contains: q.trim(), mode: 'insensitive' };
    return this.prisma.carTrim.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true,
        fuelType: true, transmission: true, drivetrain: true,
        engineCC: true, engineLabel: true,
        generation: { select: { id: true, yearFrom: true, yearTo: true } },
      },
    });
  }, 300_000);
}

async getYearsByModel(modelId: string): Promise<number[]> {
  const key = `vehicles:years:${modelId}`;
  return this.cache.getOrSet(key, async () => {
    const result = await this.prisma.listingVehicleSpec.findMany({
      where: { modelId, listing: { status: 'ACTIVE' }, year: { not: null } },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });
    return result.map(r => r.year as number).filter(Boolean);
  }, 120_000);
}
