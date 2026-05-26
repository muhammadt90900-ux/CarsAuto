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
        const page = Math.max(1, Number(query.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
        const skip = (page - 1) * limit;
        const where = { status: 'ACTIVE' };
        // ── Listing-level filters ────────────────────────────────────────────────
        if (query.type)
            where.type = query.type;
        if (query.locationId)
            where.locationId = query.locationId;
        // Price range
        if (query.minPrice || query.maxPrice) {
            where.price = {};
            if (query.minPrice)
                where.price.gte = Number(query.minPrice);
            if (query.maxPrice)
                where.price.lte = Number(query.maxPrice);
        }
        // ── Vehicle spec filters ──────────────────────────────────────────────────
        const specWhere = {};
        let hasSpecFilter = false;
        if (query.brandId) {
            specWhere.brandId = query.brandId;
            hasSpecFilter = true;
        }
        if (query.modelId) {
            specWhere.modelId = query.modelId;
            hasSpecFilter = true;
        }
        if (query.trimId) {
            specWhere.trimId = query.trimId;
            hasSpecFilter = true;
        }
        if (query.condition) {
            specWhere.condition = query.condition;
            hasSpecFilter = true;
        }
        if (query.fuelType) {
            specWhere.fuelType = query.fuelType;
            hasSpecFilter = true;
        }
        if (query.transmission) {
            specWhere.transmission = query.transmission;
            hasSpecFilter = true;
        }
        if (query.color) {
            specWhere.color = { equals: query.color, mode: 'insensitive' };
            hasSpecFilter = true;
        }
        // Year
        if (query.year) {
            specWhere.year = Number(query.year);
            hasSpecFilter = true;
        }
        else if (query.minYear || query.maxYear) {
            specWhere.year = {};
            if (query.minYear)
                specWhere.year.gte = Number(query.minYear);
            if (query.maxYear)
                specWhere.year.lte = Number(query.maxYear);
            hasSpecFilter = true;
        }
        // Mileage
        if (query.minMileage || query.maxMileage) {
            specWhere.mileageKm = {};
            if (query.minMileage)
                specWhere.mileageKm.gte = Number(query.minMileage);
            if (query.maxMileage)
                specWhere.mileageKm.lte = Number(query.maxMileage);
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
                    images: { where: { isCover: true }, take: 1, orderBy: { order: 'asc' } },
                    location: true,
                    user: { select: { id: true, name: true, avatar: true, verified: true } },
                    vehicleSpec: {
                        include: {
                            brand: { select: { id: true, nameEn: true, nameAr: true, nameKu: true, logoUrl: true } },
                            model: { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
                            trim: { select: { id: true, name: true, fuelType: true, transmission: true, bodyType: true, engineLabel: true } },
                        },
                    },
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
                images: { orderBy: { order: 'asc' } },
                location: true,
                user: { select: { id: true, name: true, avatar: true, verified: true, phone: true } },
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
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        // Increment view count (fire-and-forget — don't await)
        this.prisma.listing
            .update({ where: { id }, data: { views: { increment: 1 } } })
            .catch(() => { });
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
                                order: i,
                            })),
                        },
                    }
                    : {}),
            },
            include: {
                images: { orderBy: { order: 'asc' } },
                vehicleSpec: true,
                location: true,
            },
        });
    }
    async myListings(userId) {
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
    async update(id, userId, data) {
        const listing = await this.prisma.listing.findFirst({ where: { id, userId } });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        return this.prisma.listing.update({
            where: { id },
            data: { ...data },
        });
    }
    async delete(id, userId) {
        const listing = await this.prisma.listing.findFirst({ where: { id } });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        if (listing.userId !== userId)
            throw new common_1.ForbiddenException('Not authorized');
        return this.prisma.listing.delete({ where: { id } });
    }
};
exports.ListingsService = ListingsService;
exports.ListingsService = ListingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ListingsService);
