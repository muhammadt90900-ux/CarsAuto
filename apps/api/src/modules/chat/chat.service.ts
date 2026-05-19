import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateChat(listingId: string, buyerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const existing = await this.prisma.chat.findFirst({
      where: { listingId, buyerId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
    if (existing) return existing;

    return this.prisma.chat.create({
      data: { listingId, buyerId, sellerId: listing.userId },
      include: { messages: true },
    });
  }

  async getMyChats(userId: string) {
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

  async sendMessage(chatId: string, senderId: string, content: string, type = 'text') {
    const msg = await this.prisma.message.create({
      data: { chatId, senderId, content, type },
    });
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
    return msg;
  }

  async getChatMessages(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
  }
}
