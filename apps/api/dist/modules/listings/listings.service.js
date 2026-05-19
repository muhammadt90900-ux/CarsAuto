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
        if (query.type)
            where.type = query.type;
        if (query.locationId)
            where.locationId = query.locationId;
        if (query.minPrice || query.maxPrice) {
            where.price = {};
            if (query.minPrice)
                where.price.gte = Number(query.minPrice);
            if (query.maxPrice)
                where.price.lte = Number(query.maxPrice);
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
    async findOne(id) {
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
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        await this.prisma.listing.update({
            where: { id },
            data: { views: { increment: 1 } },
        });
        return listing;
    }
    async create(data) {
        return this.prisma.listing.create({ data: { ...data, user: { connect: { id: data.userId } }, userId: undefined } });
    }
    async myListings(userId) {
        return this.prisma.listing.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { images: { where: { isCover: true }, take: 1 } },
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
