import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Chat CRUD
  // ---------------------------------------------------------------------------

  async getOrCreateChat(listingId: string, buyerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    // Prevent a seller from chatting with themselves
    if (listing.userId === buyerId) throw new ForbiddenException('You cannot chat with yourself');

    const existing = await this.prisma.chat.findFirst({
      where: { listingId, buyerId, archivedBy: { has: buyerId } ? { not: { has: buyerId } } : undefined },
      include: {
        listing: { include: { images: { where: { isCover: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });
    if (existing) return existing;

    return this.prisma.chat.create({
      data: { listingId, buyerId, sellerId: listing.userId },
      include: {
        listing: { include: { images: { where: { isCover: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: true,
      },
    });
  }

  async getMyChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        NOT: { archivedBy: { has: userId } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        listing: { include: { images: { where: { isCover: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    // Attach per-chat unread count
    const withUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            readBy: { none: { userId } },
          },
        });
        return { ...chat, unreadCount };
      }),
    );

    return withUnread;
  }

  async archiveChat(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.buyerId !== userId && chat.sellerId !== userId)
      throw new ForbiddenException('Access denied');

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { archivedBy: { push: userId } },
    });
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  async getChatMessages(chatId: string, cursor?: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        readBy: { select: { userId: true } },
      },
    });

    const hasMore = messages.length > limit;
    return {
      messages: hasMore ? messages.slice(0, limit) : messages,
      hasMore,
      nextCursor: hasMore ? messages[limit - 1].id : null,
    };
  }

  async sendMessage(chatId: string, senderId: string, content: string, type = 'text') {
    const msg = await this.prisma.message.create({
      data: { chatId, senderId, content, type },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return msg;
  }

  // ---------------------------------------------------------------------------
  // Read receipts & unread counts
  // ---------------------------------------------------------------------------

  async markChatRead(chatId: string, userId: string) {
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        chatId,
        senderId: { not: userId },
        readBy: { none: { userId } },
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) return;

    await this.prisma.$transaction(
      unreadMessages.map((msg) =>
        this.prisma.messageReadReceipt.upsert({
          where: { messageId_userId: { messageId: msg.id, userId } },
          create: { messageId: msg.id, userId },
          update: {},
        }),
      ),
    );
  }

  async getTotalUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.message.count({
      where: {
        senderId: { not: userId },
        chat: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        readBy: { none: { userId } },
      },
    });
    return { count };
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  async getOtherParticipant(chatId: string, userId: string): Promise<string | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { buyerId: true, sellerId: true },
    });
    if (!chat) return null;
    return chat.buyerId === userId ? chat.sellerId : chat.buyerId;
  }
}
