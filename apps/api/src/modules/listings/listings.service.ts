// apps/api/src/modules/listings/listings.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
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
  }) {
    const page  = Math.max(1, Number(query.page  ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip  = (page - 1) * limit;

    const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };

    // ── Listing-level filters ────────────────────────────────────────────────
    if (query.type)       where.type       = query.type as any;
    if (query.locationId) where.locationId = query.locationId;

    // Price range
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) (where.price as any).gte = Number(query.minPrice);
      if (query.maxPrice) (where.price as any).lte = Number(query.maxPrice);
    }

    // ── Vehicle spec filters ──────────────────────────────────────────────────
    const specWhere: Prisma.ListingVehicleSpecWhereInput = {};
    let hasSpecFilter = false;

    if (query.brandId)    { specWhere.brandId    = query.brandId;            hasSpecFilter = true; }
    if (query.modelId)    { specWhere.modelId    = query.modelId;            hasSpecFilter = true; }
    if (query.trimId)     { specWhere.trimId     = query.trimId;             hasSpecFilter = true; }
    if (query.condition)  { specWhere.condition  = query.condition  as any;  hasSpecFilter = true; }
    if (query.fuelType)   { specWhere.fuelType   = query.fuelType   as any;  hasSpecFilter = true; }
    if (query.transmission){ specWhere.transmission = query.transmission as any; hasSpecFilter = true; }
    if (query.color)      { specWhere.color = { equals: query.color, mode: 'insensitive' }; hasSpecFilter = true; }

    // Year
    if (query.year) {
      specWhere.year = Number(query.year);
      hasSpecFilter = true;
    } else if (query.minYear || query.maxYear) {
      specWhere.year = {};
      if (query.minYear) (specWhere.year as any).gte = Number(query.minYear);
      if (query.maxYear) (specWhere.year as any).lte = Number(query.maxYear);
      hasSpecFilter = true;
    }

    // Mileage
    if (query.minMileage || query.maxMileage) {
      specWhere.mileageKm = {};
      if (query.minMileage) (specWhere.mileageKm as any).gte = Number(query.minMileage);
      if (query.maxMileage) (specWhere.mileageKm as any).lte = Number(query.maxMileage);
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
          images:   { where: { isCover: true }, take: 1, orderBy: { order: 'asc' } },
          location: true,
          user:     { select: { id: true, name: true, avatar: true, verified: true } },
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

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images:   { orderBy: { order: 'asc' } },
        location: true,
        user:     { select: { id: true, name: true, avatar: true, verified: true, phone: true } },
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
      },
    });

    if (!listing) throw new NotFoundException('Listing not found');

    // Increment view count (fire-and-forget — don't await)
    this.prisma.listing
      .update({ where: { id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    return listing;
  }

  async create(data: CreateListingDto & { userId: string }) {
    const { images, userId, ...rest } = data as any;

    return this.prisma.listing.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
        ...(images?.length
          ? {
              images: {
                create: images.map((url: string, i: number) => ({
                  url,
                  isCover: i === 0,
                  order: i,
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
  }

  async myListings(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { isCover: true }, take: 1 },
        vehicleSpec: {
          include: {
            brand: { select: { id: true, nameEn: true, logoUrl: true } },
            model: { select: { id: true, nameEn: true } },
          },
        },
      },
    });
  }

  async update(id: string, userId: string, data: Partial<CreateListingDto>) {
    const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
    if (!listing) throw new NotFoundException('Listing not found');

    return this.prisma.listing.update({
      where: { id },
      data: { ...data } as any,
    });
  }

  async delete(id: string, userId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenException('Not authorized');

    return this.prisma.listing.delete({ where: { id } });
  }
}
