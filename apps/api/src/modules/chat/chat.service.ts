import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Helper: verify the requesting user is a participant in the chat
  private async assertMembership(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { buyerId: true, sellerId: true },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.buyerId !== userId && chat.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return chat;
  }

  async getOrCreateChat(listingId: string, buyerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId === buyerId) throw new ForbiddenException('You cannot chat with yourself');

    const existing = await this.prisma.chat.findFirst({
      where: { listingId, buyerId },
      include: {
        listing: { include: { images: { where: { isCover: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
            readReceipts: { select: { userId: true, readAt: true } },
          },
        },
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
        // archivedBy field not in schema; filter by active status
        status: 'active',
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        listing: { include: { images: { where: { isCover: true }, take: 1 } } },
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { readReceipts: { select: { userId: true } } },
        },
      },
    });

    const withUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            readReceipts: { none: { userId } },
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
      data: { status: 'archived' },
    });
  }

  // Membership enforced — any user could read any chat's messages
  async getChatMessagesSecure(chatId: string, userId: string, cursor?: string, limit = 50) {
    await this.assertMembership(chatId, userId);
    return this.getChatMessages(chatId, cursor, limit);
  }

  async getChatMessages(chatId: string, cursor?: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        // Include read receipts for delivery/read status
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });
    const hasMore = messages.length > limit;
    return {
      messages: hasMore ? messages.slice(0, limit) : messages,
      hasMore,
      nextCursor: hasMore ? messages[limit - 1]!.id : null,
    };
  }

  // ─── Message delivery guarantee: get messages since a timestamp ─────────────
  async getMessagesSince(chatId: string, userId: string, since: Date) {
    await this.assertMembership(chatId, userId);
    return this.prisma.message.findMany({
      where: {
        chatId,
        createdAt: { gt: since },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });
  }

  // Membership enforced before sending
  async sendMessageSecure(chatId: string, senderId: string, content: string, type = 'text') {
    await this.assertMembership(chatId, senderId);
    return this.sendMessage(chatId, senderId, content, type);
  }

  async sendMessage(chatId: string, senderId: string, content: string, type = 'text') {
    // Whitelist allowed message types
    const safeType = ['text', 'image', 'offer'].includes(type) ? type : 'text';
    const msg = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
        type: safeType,
        // Auto-mark as read by sender
        readReceipts: {
          create: { userId: senderId },
        },
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
    return msg;
  }

  // ─── Read receipts ──────────────────────────────────────────────────────────

  async markChatRead(chatId: string, userId: string) {
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        chatId,
        senderId: { not: userId },
        readReceipts: { none: { userId } },
      },
      select: { id: true },
    });
    if (unreadMessages.length === 0) return 0;

    await this.prisma.$transaction(
      unreadMessages.map((msg) =>
        this.prisma.messageReadReceipt.upsert({
          where: { messageId_userId: { messageId: msg.id, userId } },
          create: { messageId: msg.id, userId },
          update: {},
        }),
      ),
    );
    return unreadMessages.length;
  }

  async markSpecificMessagesRead(messageIds: string[], userId: string) {
    if (!messageIds.length) return;
    await this.prisma.$transaction(
      messageIds.map((messageId) =>
        this.prisma.messageReadReceipt.upsert({
          where: { messageId_userId: { messageId, userId } },
          create: { messageId, userId },
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
        readReceipts: { none: { userId } },
      },
    });
    return { count };
  }

  async getOtherParticipant(chatId: string, userId: string): Promise<string | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { buyerId: true, sellerId: true },
    });
    if (!chat) return null;
    return chat.buyerId === userId ? chat.sellerId : chat.buyerId;
  }
}
