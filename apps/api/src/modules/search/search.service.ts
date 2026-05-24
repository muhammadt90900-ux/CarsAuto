// apps/api/src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 20, ...filters } = options;
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };

    // ── Full-text search across all localised title/description fields ───────
    if (q?.trim()) {
      where.OR = [
        { titleKu:       { contains: q.trim(), mode: 'insensitive' } },
        { titleAr:       { contains: q.trim(), mode: 'insensitive' } },
        { titleEn:       { contains: q.trim(), mode: 'insensitive' } },
        { descriptionKu: { contains: q.trim(), mode: 'insensitive' } },
        { descriptionEn: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    // ── Structured filters (combinable with text search) ─────────────────────
    if (filters.type)       where.type       = filters.type;
    if (filters.condition)  where.condition  = filters.condition;
    if (filters.locationId) where.locationId = filters.locationId;

    // Vehicle hierarchy
    if (filters.brandId) where.makeId  = filters.brandId;
    if (filters.modelId) where.modelId = filters.modelId;
    if (filters.trimId)  where.trimId  = filters.trimId;

    // Year
    if (filters.year) {
      where.year = Number(filters.year);
    } else if (filters.minYear || filters.maxYear) {
      where.year = {};
      if (filters.minYear) where.year.gte = Number(filters.minYear);
      if (filters.maxYear) where.year.lte = Number(filters.maxYear);
    }

    // Price
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = Number(filters.minPrice);
      if (filters.maxPrice) where.price.lte = Number(filters.maxPrice);
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
          make:     { select: { id: true, nameEn: true, nameAr: true, nameKu: true, logo: true } },
          model:    { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
          trim:     { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
