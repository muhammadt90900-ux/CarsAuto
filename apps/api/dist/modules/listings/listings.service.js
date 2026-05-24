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
exports.ListingsService = void 0;
// apps/api/src/modules/listings/listings.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ListingsService = class ListingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 20);
        const skip = (page - 1) * limit;
        const where = { status: 'ACTIVE' };
        // ── Basic filters ───────────────────────────────────────────────────────
        if (query.type)
            where.type = query.type;
        if (query.locationId)
            where.locationId = query.locationId;
        if (query.condition)
            where.condition = query.condition;
        // ── Price range ─────────────────────────────────────────────────────────
        if (query.minPrice || query.maxPrice) {
            where.price = {};
            if (query.minPrice)
                where.price.gte = Number(query.minPrice);
            if (query.maxPrice)
                where.price.lte = Number(query.maxPrice);
        }
        // ── Vehicle hierarchy filters ───────────────────────────────────────────
        // Each level is independent so the frontend can filter at any granularity.
        if (query.brandId)
            where.makeId = query.brandId;
        if (query.modelId)
            where.modelId = query.modelId;
        if (query.trimId)
            where.trimId = query.trimId;
        // ── Year range ──────────────────────────────────────────────────────────
        if (query.year) {
            where.year = Number(query.year);
        }
        else if (query.minYear || query.maxYear) {
            where.year = {};
            if (query.minYear)
                where.year.gte = Number(query.minYear);
            if (query.maxYear)
                where.year.lte = Number(query.maxYear);
        }
        // ── Mileage cap ─────────────────────────────────────────────────────────
        if (query.maxMileage) {
            where.mileage = { lte: Number(query.maxMileage) };
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
                    // Vehicle relations — lean selects to keep payload small
                    make: { select: { id: true, nameEn: true, nameAr: true, nameKu: true, logo: true } },
                    model: { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
                    trim: { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
                },
            }),
            this.prisma.listing.count({ where }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findOne(id) {
        const listing = await this.prisma.listing.findUnique({
            where: { id },
            include: {
                images: true,
                location: true,
                user: {
                    select: { id: true, name: true, avatar: true, verified: true, phone: true },
                },
                make: { select: { id: true, nameEn: true, nameAr: true, nameKu: true, logo: true } },
                model: { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
                trim: { select: { id: true, nameEn: true, nameAr: true, nameKu: true, engine: true, transmission: true, fuelType: true } },
            },
        });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        await this.prisma.listing.update({
            where: { id },
            data: { views: { increment: 1 } },
        });
        return listing;
    }
    async create(data) {
        const { images, userId, ...rest } = data;
        return this.prisma.listing.create({
            data: {
                ...rest,
                user: { connect: { id: userId } },
                ...(images?.length
                    ? {
                        images: {
                            create: images.map((url, i) => ({
                                url,
                                isCover: i === 0,
                            })),
                        },
                    }
                    : {}),
            },
        });
    }
    async myListings(userId) {
        return this.prisma.listing.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                images: { where: { isCover: true }, take: 1 },
                make: { select: { id: true, nameEn: true, logo: true } },
                model: { select: { id: true, nameEn: true } },
            },
        });
    }
    async delete(id, userId) {
        const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        return this.prisma.listing.delete({ where: { id } });
    }
};
exports.ListingsService = ListingsService;
exports.ListingsService = ListingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ListingsService);
