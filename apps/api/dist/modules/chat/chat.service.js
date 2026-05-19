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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ChatService = class ChatService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateChat(listingId, buyerId) {
        const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
        if (!listing)
            throw new common_1.NotFoundException('Listing not found');
        const existing = await this.prisma.chat.findFirst({
            where: { listingId, buyerId },
            include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
        });
        if (existing)
            return existing;
        return this.prisma.chat.create({
            data: { listingId, buyerId, sellerId: listing.userId },
            include: { messages: true },
        });
    }
    async getMyChats(userId) {
        return this.prisma.chat.findMany({
            where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
            orderBy: { updatedAt: 'desc' },
            include: {
                listing: {
                    include: { images: { where: { isCover: true }, take: 1 } },
                },
                buyer: { select: { id: true, name: true, avatar: true } },
                seller: { select: { id: true, name: true, avatar: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });
    }
    async sendMessage(chatId, senderId, content, type = 'text') {
        const msg = await this.prisma.message.create({
            data: { chatId, senderId, content, type },
        });
        await this.prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
        });
        return msg;
    }
    async getChatMessages(chatId) {
        return this.prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, name: true, avatar: true } } },
        });
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
