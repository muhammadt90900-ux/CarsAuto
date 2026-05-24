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
exports.VehiclesService = void 0;
// apps/api/src/modules/vehicles/vehicles.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let VehiclesService = class VehiclesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ─── Brands ────────────────────────────────────────────────────────────────
    /**
     * Returns all active vehicle brands, optionally filtered by a search term.
     * Ordered alphabetically; includes the total listing count per brand so the
     * frontend can show how many cars are available.
     */
    async getBrands({ q }) {
        const where = { active: true };
        if (q?.trim()) {
            where.OR = [
                { nameEn: { contains: q.trim(), mode: 'insensitive' } },
                { nameAr: { contains: q.trim(), mode: 'insensitive' } },
                { nameKu: { contains: q.trim(), mode: 'insensitive' } },
            ];
        }
        const brands = await this.prisma.vehicleBrand.findMany({
            where,
            orderBy: { nameEn: 'asc' },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                nameKu: true,
                logo: true,
                slug: true,
                _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
            },
        });
        return brands.map((b) => ({
            id: b.id,
            nameEn: b.nameEn,
            nameAr: b.nameAr,
            nameKu: b.nameKu,
            logo: b.logo,
            slug: b.slug,
            listingCount: b._count.listings,
        }));
    }
    // ─── Models ────────────────────────────────────────────────────────────────
    /**
     * Returns all models that belong to a specific brand.
     * Supports an optional search term for typeahead filtering.
     * When the brand changes on the frontend this endpoint is re-called, so the
     * response is always scoped to the selected brandId.
     */
    async getModelsByBrand(brandId, { q }) {
        const where = { brandId, active: true };
        if (q?.trim()) {
            where.OR = [
                { nameEn: { contains: q.trim(), mode: 'insensitive' } },
                { nameAr: { contains: q.trim(), mode: 'insensitive' } },
                { nameKu: { contains: q.trim(), mode: 'insensitive' } },
            ];
        }
        const models = await this.prisma.vehicleModel.findMany({
            where,
            orderBy: { nameEn: 'asc' },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                nameKu: true,
                slug: true,
                brandId: true,
                startYear: true,
                endYear: true,
                _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
            },
        });
        return models.map((m) => ({
            id: m.id,
            nameEn: m.nameEn,
            nameAr: m.nameAr,
            nameKu: m.nameKu,
            slug: m.slug,
            brandId: m.brandId,
            startYear: m.startYear,
            endYear: m.endYear,
            listingCount: m._count.listings,
        }));
    }
    // ─── Trims ─────────────────────────────────────────────────────────────────
    /**
     * Returns trims for a given model filtered by year.
     * Trims store a yearStart / yearEnd range, so we find those whose range
     * includes the requested year.  Supports optional text search.
     * When the year changes on the frontend this endpoint is re-called.
     */
    async getTrimsByModelAndYear(modelId, { year, q }) {
        const yearNum = year ? Number(year) : undefined;
        const where = { modelId, active: true };
        // Only include trims whose production span covers the requested year
        if (yearNum) {
            where.AND = [
                {
                    OR: [
                        { yearStart: { lte: yearNum } },
                        { yearStart: null },
                    ],
                },
                {
                    OR: [
                        { yearEnd: { gte: yearNum } },
                        { yearEnd: null },
                    ],
                },
            ];
        }
        if (q?.trim()) {
            where.OR = [
                { nameEn: { contains: q.trim(), mode: 'insensitive' } },
                { nameAr: { contains: q.trim(), mode: 'insensitive' } },
                { nameKu: { contains: q.trim(), mode: 'insensitive' } },
            ];
        }
        return this.prisma.vehicleTrim.findMany({
            where,
            orderBy: { nameEn: 'asc' },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                nameKu: true,
                modelId: true,
                yearStart: true,
                yearEnd: true,
                engine: true,
                transmission: true,
                fuelType: true,
                drivetrain: true,
            },
        });
    }
    // ─── Available Years ────────────────────────────────────────────────────────
    /**
     * Returns the distinct years available for listings of a given model.
     * Used to populate the year dropdown when a model is selected.
     */
    async getYearsByModel(modelId) {
        const result = await this.prisma.listing.findMany({
            where: { modelId, status: 'ACTIVE', year: { not: null } },
            select: { year: true },
            distinct: ['year'],
            orderBy: { year: 'desc' },
        });
        return result.map((r) => r.year).filter(Boolean);
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VehiclesService);
