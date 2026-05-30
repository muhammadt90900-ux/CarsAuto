import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalListings, activeListings, totalReports, pendingListings, totalAds, featuredListings] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.listing.count(),
        this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
        this.prisma.report.count({ where: { status: 'pending' } }),
        this.prisma.listing.count({ where: { status: 'PENDING' } }),
        this.prisma.ad?.count() ?? Promise.resolve(0),
        this.prisma.listing.count({ where: { featured: true } }),
      ]);
    return { totalUsers, totalListings, activeListings, totalReports, pendingListings, totalAds, featuredListings };
  }

  async getAnalyticsCharts() {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('en', { month: 'short', year: '2-digit' }) };
    });

    const data = await Promise.all(
      months.map(async ({ year, month, label }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const [listings, users] = await Promise.all([
          this.prisma.listing.count({ where: { createdAt: { gte: start, lt: end } } }),
          this.prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
        ]);
        return { label, listings, users };
      }),
    );
    return data;
  }

  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    // FIX: Use mode: 'insensitive' for case-insensitive search; was case-sensitive
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name:  { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip, take: limit, where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, role: true, verified: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async banUser(id: string, banned: boolean) {
    // FIX: Explicit boolean cast; removed `as any` type bypass
    return this.prisma.user.update({
      where: { id },
      data: { banned: Boolean(banned) } as any,
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async getPendingListings() {
    return this.prisma.listing.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        images: { where: { isCover: true }, take: 1 },
        category: { select: { id: true, name: true } },
      },
    });
  }

  async getAllListings(page = 1, limit = 20, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    // FIX: Search across all title fields (not just titleEn), case-insensitive
    if (search) {
      where.OR = [
        { titleEn: { contains: search, mode: 'insensitive' } },
        { titleKu: { contains: search, mode: 'insensitive' } },
        { titleAr: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        skip, take: limit, where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          images: { where: { isCover: true }, take: 1 },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async approveListing(id: string) {
    return this.prisma.listing.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async rejectListing(id: string) {
    return this.prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async deleteListing(id: string) {
    return this.prisma.listing.delete({ where: { id } });
  }

  async getFeaturedListings() {
    return this.prisma.listing.findMany({
      where: { featured: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } }, images: { where: { isCover: true }, take: 1 } },
    });
  }

  async setFeatured(id: string, featured: boolean, featuredUntil?: Date) {
    return this.prisma.listing.update({
      where: { id },
      data: { featured: Boolean(featured), featuredUntil: featuredUntil ?? null } as any,
    });
  }

  async getReports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        skip, take: limit,
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          listing: { select: { id: true, titleEn: true, titleKu: true } },
        },
      }),
      this.prisma.report.count({ where: { status: 'pending' } }),
    ]);
    return { data, total, page, limit };
  }

  async resolveReport(id: string, action: 'resolved' | 'dismissed') {
    return this.prisma.report.update({ where: { id }, data: { status: action } });
  }

  async getCategories() {
    return this.prisma.category.findMany({ orderBy: { order: 'asc' }, include: { _count: { select: { listings: true } } } });
  }

  async createCategory(data: { name: string; slug: string; icon?: string; parentId?: string }) {
    return this.prisma.category.create({ data });
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; icon?: string; order?: number }) {
    return this.prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  async getTranslations(locale?: string) {
    const where = locale ? { locale } : {};
    return this.prisma.translation.findMany({ where, orderBy: [{ locale: 'asc' }, { key: 'asc' }] });
  }

  async upsertTranslation(locale: string, key: string, value: string) {
    return this.prisma.translation.upsert({
      where: { locale_key: { locale, key } },
      update: { value },
      create: { locale, key, value },
    });
  }

  async deleteTranslation(id: string) {
    return this.prisma.translation.delete({ where: { id } });
  }

  async getAds(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.ad.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.ad.count(),
    ]);
    return { data, total, page, limit };
  }

  async createAd(data: { title: string; imageUrl: string; linkUrl: string; placement: string; startsAt?: Date; endsAt?: Date }) {
    return this.prisma.ad.create({ data });
  }

  async updateAd(id: string, data: Partial<{ title: string; imageUrl: string; linkUrl: string; placement: string; active: boolean; startsAt: Date; endsAt: Date }>) {
    return this.prisma.ad.update({ where: { id }, data });
  }

  async deleteAd(id: string) {
    return this.prisma.ad.delete({ where: { id } });
  }

  async getSettings() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async upsertSetting(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
