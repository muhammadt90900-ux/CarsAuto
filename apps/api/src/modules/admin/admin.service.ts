import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalListings, activeListings, totalReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.report.count({ where: { status: 'pending' } }),
    ]);
    return { totalUsers, totalListings, activeListings, totalReports };
  }

  async getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, role: true, verified: true, createdAt: true },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total };
  }

  async getPendingListings() {
    return this.prisma.listing.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        images: { where: { isCover: true }, take: 1 },
      },
    });
  }

  async approveListing(id: string) {
    return this.prisma.listing.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async rejectListing(id: string) {
    return this.prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async getReports() {
    return this.prisma.report.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { reporter: { select: { id: true, name: true, email: true } } },
    });
  }
}
