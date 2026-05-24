// apps/api/src/modules/vehicles/vehicles.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BrandQueryDto, ModelQueryDto, TrimQueryDto } from './dto/vehicle-query.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  // ─── Brands ────────────────────────────────────────────────────────────────

  /**
   * Returns all active vehicle brands, optionally filtered by a search term.
   * Ordered alphabetically; includes the total listing count per brand so the
   * frontend can show how many cars are available.
   */
  async getBrands({ q }: BrandQueryDto) {
    const where: any = { active: true };

    if (q?.trim()) {
      where.OR = [
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
        { nameAr: { contains: q.trim(), mode: 'insensitive' } },
        { nameKu: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const brands = await this.prisma.vehicleBrand.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        nameKu: true,
        logo: true,
        slug: true,
        _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
      },
    });

    return brands.map((b) => ({
      id: b.id,
      nameEn: b.nameEn,
      nameAr: b.nameAr,
      nameKu: b.nameKu,
      logo: b.logo,
      slug: b.slug,
      listingCount: b._count.listings,
    }));
  }

  // ─── Models ────────────────────────────────────────────────────────────────

  /**
   * Returns all models that belong to a specific brand.
   * Supports an optional search term for typeahead filtering.
   * When the brand changes on the frontend this endpoint is re-called, so the
   * response is always scoped to the selected brandId.
   */
  async getModelsByBrand(brandId: string, { q }: ModelQueryDto) {
    const where: any = { brandId, active: true };

    if (q?.trim()) {
      where.OR = [
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
        { nameAr: { contains: q.trim(), mode: 'insensitive' } },
        { nameKu: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const models = await this.prisma.vehicleModel.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        nameKu: true,
        slug: true,
        brandId: true,
        startYear: true,
        endYear: true,
        _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
      },
    });

    return models.map((m) => ({
      id: m.id,
      nameEn: m.nameEn,
      nameAr: m.nameAr,
      nameKu: m.nameKu,
      slug: m.slug,
      brandId: m.brandId,
      startYear: m.startYear,
      endYear: m.endYear,
      listingCount: m._count.listings,
    }));
  }

  // ─── Trims ─────────────────────────────────────────────────────────────────

  /**
   * Returns trims for a given model filtered by year.
   * Trims store a yearStart / yearEnd range, so we find those whose range
   * includes the requested year.  Supports optional text search.
   * When the year changes on the frontend this endpoint is re-called.
   */
  async getTrimsByModelAndYear(
    modelId: string,
    { year, q }: TrimQueryDto,
  ) {
    const yearNum = year ? Number(year) : undefined;

    const where: any = { modelId, active: true };

    // Only include trims whose production span covers the requested year
    if (yearNum) {
      where.AND = [
        {
          OR: [
            { yearStart: { lte: yearNum } },
            { yearStart: null },
          ],
        },
        {
          OR: [
            { yearEnd: { gte: yearNum } },
            { yearEnd: null },
          ],
        },
      ];
    }

    if (q?.trim()) {
      where.OR = [
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
        { nameAr: { contains: q.trim(), mode: 'insensitive' } },
        { nameKu: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    return this.prisma.vehicleTrim.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        nameKu: true,
        modelId: true,
        yearStart: true,
        yearEnd: true,
        engine: true,
        transmission: true,
        fuelType: true,
        drivetrain: true,
      },
    });
  }

  // ─── Available Years ────────────────────────────────────────────────────────

  /**
   * Returns the distinct years available for listings of a given model.
   * Used to populate the year dropdown when a model is selected.
   */
  async getYearsByModel(modelId: string): Promise<number[]> {
    const result = await this.prisma.listing.findMany({
      where: { modelId, status: 'ACTIVE', year: { not: null } },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });

    return result.map((r) => r.year as number).filter(Boolean);
  }
}
