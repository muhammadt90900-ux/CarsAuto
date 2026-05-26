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
exports.SearchService = void 0;
// apps/api/src/modules/search/search.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SearchService = class SearchService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(q, options = {}) {
        const { page = 1, limit = 20, ...filters } = options;
        const skip = (page - 1) * limit;
        // ── Base where clause ────────────────────────────────────────────────────
        const where = { status: 'ACTIVE' };
        // ── Full-text search across all localised title/description fields ───────
        if (q?.trim()) {
            where.OR = [
                { titleKu: { contains: q.trim(), mode: 'insensitive' } },
                { titleAr: { contains: q.trim(), mode: 'insensitive' } },
                { titleEn: { contains: q.trim(), mode: 'insensitive' } },
                { titleZh: { contains: q.trim(), mode: 'insensitive' } },
                { descriptionKu: { contains: q.trim(), mode: 'insensitive' } },
                { descriptionAr: { contains: q.trim(), mode: 'insensitive' } },
                { descriptionEn: { contains: q.trim(), mode: 'insensitive' } },
            ];
        }
        // ── Listing-level filters ────────────────────────────────────────────────
        if (filters.type)
            where.type = filters.type;
        if (filters.locationId)
            where.locationId = filters.locationId;
        // ── Price range ──────────────────────────────────────────────────────────
        if (filters.minPrice || filters.maxPrice) {
            where.price = {};
            if (filters.minPrice)
                where.price.gte = Number(filters.minPrice);
            if (filters.maxPrice)
                where.price.lte = Number(filters.maxPrice);
        }
        // ── Vehicle spec filters (nested into vehicleSpec relation) ──────────────
        const specWhere = {};
        let hasSpecFilter = false;
        if (filters.brandId) {
            specWhere.brandId = filters.brandId;
            hasSpecFilter = true;
        }
        if (filters.modelId) {
            specWhere.modelId = filters.modelId;
            hasSpecFilter = true;
        }
        if (filters.trimId) {
            specWhere.trimId = filters.trimId;
            hasSpecFilter = true;
        }
        if (filters.condition) {
            specWhere.condition = filters.condition;
            hasSpecFilter = true;
        }
        if (filters.fuelType) {
            specWhere.fuelType = filters.fuelType;
            hasSpecFilter = true;
        }
        if (filters.transmission) {
            specWhere.transmission = filters.transmission;
            hasSpecFilter = true;
        }
        if (filters.color) {
            specWhere.color = { equals: filters.color, mode: 'insensitive' };
            hasSpecFilter = true;
        }
        // Year
        if (filters.year) {
            specWhere.year = Number(filters.year);
            hasSpecFilter = true;
        }
        else if (filters.minYear || filters.maxYear) {
            specWhere.year = {};
            if (filters.minYear)
                specWhere.year.gte = Number(filters.minYear);
            if (filters.maxYear)
                specWhere.year.lte = Number(filters.maxYear);
            hasSpecFilter = true;
        }
        // Mileage
        if (filters.minMileage || filters.maxMileage) {
            specWhere.mileageKm = {};
            if (filters.minMileage)
                specWhere.mileageKm.gte = Number(filters.minMileage);
            if (filters.maxMileage)
                specWhere.mileageKm.lte = Number(filters.maxMileage);
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
                    images: { where: { isCover: true }, take: 1 },
                    location: true,
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
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    // ── Autocomplete suggestions ─────────────────────────────────────────────
    async autocomplete(q, limit = 6) {
        if (!q || q.trim().length < 2)
            return [];
        const listings = await this.prisma.listing.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { titleEn: { contains: q.trim(), mode: 'insensitive' } },
                    { titleKu: { contains: q.trim(), mode: 'insensitive' } },
                    { titleAr: { contains: q.trim(), mode: 'insensitive' } },
                ],
            },
            select: { titleEn: true, titleKu: true },
            distinct: ['titleEn'],
            take: limit,
        });
        return listings.map((l) => l.titleEn || l.titleKu);
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
