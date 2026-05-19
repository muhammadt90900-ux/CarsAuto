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
    async approveListing(id) {
        return this.prisma.listing.update({ where: { id }, data: { status: 'ACTIVE' } });
    }
    async rejectListing(id) {
        return this.prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
    }
    async getReports() {
        return this.prisma.report.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'desc' },
            include: { reporter: { select: { id: true, name: true, email: true } } },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
