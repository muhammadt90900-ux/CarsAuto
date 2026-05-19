import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    locationId?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = { status: 'ACTIVE' };
    if (query.type) where.type = query.type;
    if (query.locationId) where.locationId = query.locationId;
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = Number(query.minPrice);
      if (query.maxPrice) where.price.lte = Number(query.maxPrice);
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: {
          images: { where: { isCover: true }, take: 1 },
          location: true,
          user: { select: { id: true, name: true, avatar: true, verified: true } },
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
        images: true,
        location: true,
        user: {
          select: { id: true, name: true, avatar: true, verified: true, phone: true },
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    await this.prisma.listing.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return listing;
  }

  async create(data: CreateListingDto & { userId: string }) {
    return this.prisma.listing.create({ data: { ...data, user: { connect: { id: data.userId } }, userId: undefined } as any });
  }

  async myListings(userId: string) {
    return this.prisma.listing.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { images: { where: { isCover: true }, take: 1 } },
    });
  }

  async delete(id: string, userId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.listing.delete({ where: { id } });
  }
}
