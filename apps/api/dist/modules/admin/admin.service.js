"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ── Dashboard ────────────────────────────────────────────────────────────
    async getDashboardStats() {
        const [totalUsers, totalListings, activeListings, totalReports, pendingListings, totalAds, featuredListings] = await Promise.all([
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
        // Returns monthly listing/user counts for the last 6 months
        const now = new Date();
        const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('en', { month: 'short', year: '2-digit' }) };
        });
        const data = await Promise.all(months.map(async ({ year, month, label }) => {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 1);
            const [listings, users] = await Promise.all([
                this.prisma.listing.count({ where: { createdAt: { gte: start, lt: end } } }),
                this.prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
            ]);
            return { label, listings, users };
        }));
        return data;
    }
    // ── Users ────────────────────────────────────────────────────────────────
    async getAllUsers(page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const where = search
            ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
            : {};
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take: limit,
                where,
                orderBy: { createdAt: 'desc' },
                select: { id: true, email: true, name: true, role: true, verified: true, createdAt: true, banned: true },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { data, total, page, limit };
    }
    async banUser(id, banned) {
        return this.prisma.user.update({ where: { id }, data: { banned } });
    }
    async deleteUser(id) {
        return this.prisma.user.delete({ where: { id } });
    }
    // ── Listings ─────────────────────────────────────────────────────────────
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
    async getAllListings(page = 1, limit = 20, status, search) {
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (search)
            where.title = { contains: search, mode: 'insensitive' };
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
    async approveListing(id) {
        return this.prisma.listing.update({ where: { id }, data: { status: 'ACTIVE' } });
    }
    async rejectListing(id) {
        return this.prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
    }
    async deleteListing(id) {
        return this.prisma.listing.delete({ where: { id } });
    }
    // ── Featured Listings ────────────────────────────────────────────────────
    async getFeaturedListings() {
        return this.prisma.listing.findMany({
            where: { featured: true },
            orderBy: { featuredUntil: 'asc' },
            include: { user: { select: { id: true, name: true, email: true } }, images: { where: { isCover: true }, take: 1 } },
        });
    }
    async setFeatured(id, featured, featuredUntil) {
        return this.prisma.listing.update({ where: { id }, data: { featured, featuredUntil: featuredUntil ?? null } });
    }
    // ── Reports ──────────────────────────────────────────────────────────────
    async getReports(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.report.findMany({
                skip, take: limit,
                where: { status: 'pending' },
                orderBy: { createdAt: 'desc' },
                include: {
                    reporter: { select: { id: true, name: true, email: true } },
                    listing: { select: { id: true, title: true } },
                },
            }),
            this.prisma.report.count({ where: { status: 'pending' } }),
        ]);
        return { data, total, page, limit };
    }
    async resolveReport(id, action) {
        return this.prisma.report.update({ where: { id }, data: { status: action } });
    }
    // ── Categories ───────────────────────────────────────────────────────────
    async getCategories() {
        return this.prisma.category.findMany({ orderBy: { order: 'asc' }, include: { _count: { select: { listings: true } } } });
    }
    async createCategory(data) {
        return this.prisma.category.create({ data });
    }
    async updateCategory(id, data) {
        return this.prisma.category.update({ where: { id }, data });
    }
    async deleteCategory(id) {
        return this.prisma.category.delete({ where: { id } });
    }
    // ── Translations ─────────────────────────────────────────────────────────
    async getTranslations(locale) {
        const where = locale ? { locale } : {};
        return this.prisma.translation.findMany({ where, orderBy: [{ locale: 'asc' }, { key: 'asc' }] });
    }
    async upsertTranslation(locale, key, value) {
        return this.prisma.translation.upsert({
            where: { locale_key: { locale, key } },
            update: { value },
            create: { locale, key, value },
        });
    }
    async deleteTranslation(id) {
        return this.prisma.translation.delete({ where: { id } });
    }
    // ── Ads ──────────────────────────────────────────────────────────────────
    async getAds(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.ad.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
            this.prisma.ad.count(),
        ]);
        return { data, total, page, limit };
    }
    async createAd(data) {
        return this.prisma.ad.create({ data });
    }
    async updateAd(id, data) {
        return this.prisma.ad.update({ where: { id }, data });
    }
    async deleteAd(id) {
        return this.prisma.ad.delete({ where: { id } });
    }
    // ── System Settings ──────────────────────────────────────────────────────
    async getSettings() {
        return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    }
    async upsertSetting(key, value) {
        return this.prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
