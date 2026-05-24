// apps/api/src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(
    q: string,
    type?: string,
    makeId?: string,
    modelId?: string,
    yearFrom?: number,
    yearTo?: number,
    fuelType?: string,
    transmission?: string,
    driveType?: string,
    bodyType?: string,
    condition?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
      ...(q ? {
        OR: [
          { titleKu:       { contains: q, mode: 'insensitive' } },
          { titleAr:       { contains: q, mode: 'insensitive' } },
          { titleEn:       { contains: q, mode: 'insensitive' } },
          { descriptionKu: { contains: q, mode: 'insensitive' } },
          { descriptionEn: { contains: q, mode: 'insensitive' } },
          { trim:          { contains: q, mode: 'insensitive' } },
          { color:         { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    };

    if (type)         where.type         = type;
    if (makeId)       where.makeId        = makeId;
    if (modelId)      where.modelId       = modelId;
    if (fuelType)     where.fuelType      = fuelType;
    if (transmission) where.transmission  = transmission;
    if (driveType)    where.driveType     = driveType;
    if (bodyType)     where.bodyType      = bodyType;
    if (condition)    where.condition     = condition;

    if (yearFrom || yearTo) {
      where.year = {};
      if (yearFrom) where.year.gte = yearFrom;
      if (yearTo)   where.year.lte = yearTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take:    limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: {
          images:   { where: { isCover: true }, take: 1 },
          location: true,
          carMake:  { select: { nameEn: true, nameKu: true, nameAr: true, logoUrl: true } },
          carModel: { select: { name: true, bodyType: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
