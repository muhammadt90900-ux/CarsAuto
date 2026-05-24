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
    async search(q, type, makeId, modelId, yearFrom, yearTo, fuelType, transmission, driveType, bodyType, condition, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = {
            status: 'ACTIVE',
            ...(q ? {
                OR: [
                    { titleKu: { contains: q, mode: 'insensitive' } },
                    { titleAr: { contains: q, mode: 'insensitive' } },
                    { titleEn: { contains: q, mode: 'insensitive' } },
                    { descriptionKu: { contains: q, mode: 'insensitive' } },
                    { descriptionEn: { contains: q, mode: 'insensitive' } },
                    { trim: { contains: q, mode: 'insensitive' } },
                    { color: { contains: q, mode: 'insensitive' } },
                ],
            } : {}),
        };
        if (type)
            where.type = type;
        if (makeId)
            where.makeId = makeId;
        if (modelId)
            where.modelId = modelId;
        if (fuelType)
            where.fuelType = fuelType;
        if (transmission)
            where.transmission = transmission;
        if (driveType)
            where.driveType = driveType;
        if (bodyType)
            where.bodyType = bodyType;
        if (condition)
            where.condition = condition;
        if (yearFrom || yearTo) {
            where.year = {};
            if (yearFrom)
                where.year.gte = yearFrom;
            if (yearTo)
                where.year.lte = yearTo;
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
                    carMake: { select: { nameEn: true, nameKu: true, nameAr: true, logoUrl: true } },
                    carModel: { select: { name: true, bodyType: true } },
                },
            }),
            this.prisma.listing.count({ where }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
