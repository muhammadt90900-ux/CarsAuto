import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceNotePayload {
  chatId: string;
  audioBase64: string;   // max 2 MB raw base64
  duration: number;      // seconds, max 120
  mimeType: 'audio/webm' | 'audio/mp4' | 'audio/ogg';
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  resource_type: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Helper: assert membership ──────────────────────────────────────────────

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

  // ─── Chat CRUD ──────────────────────────────────────────────────────────────

  async getOrCreateChat(listingId: string, buyerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId === buyerId) throw new ForbiddenException('You cannot chat with yourself');

    const existing = await this.prisma.chat.findFirst({
      where: { listingId, buyerId },
      include: {
        listing: { include: { images: { where: { isCover: true }, take: 1 } } },
        buyer:  { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: {
            sender:      { select: { id: true, name: true, avatar: true } },
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
        buyer:  { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: true,
      },
    });
  }

  async getMyChats(userId: string) {
    const chats = await this.prisma.chat.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: 'active',
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        listing: { include: { images: { where: { isCover: true }, take: 1 } } },
        buyer:  { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { readReceipts: { select: { userId: true } } },
        },
      },
    });

    const withUnread = await Promise.all(
      chats.map(async (chat: any) => {
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

  // ─── Messages ───────────────────────────────────────────────────────────────

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
        sender:      { select: { id: true, name: true, avatar: true } },
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

  async getMessagesSince(chatId: string, userId: string, since: Date) {
    await this.assertMembership(chatId, userId);
    return this.prisma.message.findMany({
      where: { chatId, createdAt: { gt: since } },
      orderBy: { createdAt: 'asc' },
      include: {
        sender:      { select: { id: true, name: true, avatar: true } },
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });
  }

  async sendMessageSecure(chatId: string, senderId: string, content: string, type = 'text') {
    await this.assertMembership(chatId, senderId);
    return this.sendMessage(chatId, senderId, content, type);
  }

  async sendMessage(chatId: string, senderId: string, content: string, type = 'text') {
    const safeType = ['text', 'image', 'offer'].includes(type) ? type : 'text';
    const msg = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
        type: safeType,
        messageType: safeType,
        readReceipts: { create: { userId: senderId } },
      },
      include: {
        sender:      { select: { id: true, name: true, avatar: true } },
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });
    await this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    // ── Feature 8: Push notification to recipient (fire-and-forget) ───────────
    this.sendMessagePushToRecipient(chatId, senderId, content, safeType).catch((err) =>
      this.logger.warn(`Push for message in chat ${chatId} failed: ${err.message}`),
    );

    return msg;
  }

  /**
   * Finds the other participant in the chat and sends them a push notification.
   * Checks online status via read-receipt heuristic — if the recipient has read
   * a message in the last 60 seconds, they are likely online so we skip the push.
   */
  private async sendMessagePushToRecipient(
    chatId: string,
    senderId: string,
    content: string,
    type: string,
  ): Promise<void> {
    // Get chat with participants
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        buyerId: true,
        sellerId: true,
        listing: { select: { titleKu: true, titleAr: true, titleEn: true } },
      },
    });
    if (!chat) return;

    const recipientId = chat.buyerId === senderId ? chat.sellerId : chat.buyerId;

    // Get sender name
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });
    if (!sender) return;

    // Heuristic: skip push if recipient read something in the last 60s (likely online)
    const recentRead = await this.prisma.messageReadReceipt.findFirst({
      where: {
        userId: recipientId,
        message: { chatId },
        readAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recentRead) return; // recipient is active in the chat

    const bodyText = type === 'image'
      ? '📷 صورە / Image'
      : type === 'voice'
      ? '🎤 وتەی دەنگی / Voice note'
      : content.length > 60 ? content.slice(0, 60) + '…' : content;

    const listingTitle = chat.listing?.titleKu ?? chat.listing?.titleEn ?? '';

    await this.notifications.sendPush(recipientId, {
      title:   sender.name,
      titleKu: sender.name,
      titleAr: sender.name,
      body:    bodyText,
      bodyKu:  bodyText,
      bodyAr:  bodyText,
      url:     `/ku/dashboard/chat/${chatId}`,
      tag:     `chat-${chatId}`,
      data:    { chatId, listingTitle, senderId },
    });
  }

  // ─── Voice Notes (Feature 6) ────────────────────────────────────────────────

  async sendVoiceNote(
    chatId: string,
    senderId: string,
    payload: Omit<VoiceNotePayload, 'chatId'>,
  ) {
    await this.assertMembership(chatId, senderId);

    const { audioBase64, duration, mimeType } = payload;

    const sizeBytes = Math.ceil((audioBase64.length * 3) / 4);
    const MAX_BYTES = 2 * 1024 * 1024;
    if (sizeBytes > MAX_BYTES) {
      throw new BadRequestException('Voice note too large — maximum 2 MB');
    }

    if (!Number.isFinite(duration) || duration <= 0 || duration > 120) {
      throw new BadRequestException('Voice note duration must be between 1 and 120 seconds');
    }

    const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/ogg'] as const;
    if (!allowedMimes.includes(mimeType as any)) {
      throw new BadRequestException(`Unsupported audio format: ${mimeType}`);
    }

    const audioUrl = await this.uploadAudioToCloudinary(audioBase64, mimeType, senderId);

    const msg = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content:       '',
        type:          'voice',
        messageType:   'voice',
        audioUrl,
        audioDuration: Math.round(duration),
        readReceipts: { create: { userId: senderId } },
      },
      include: {
        sender:      { select: { id: true, name: true, avatar: true } },
        readReceipts: { select: { userId: true, readAt: true } },
      },
    });

    await this.prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    // Push for voice note too
    this.sendMessagePushToRecipient(chatId, senderId, '', 'voice').catch(() => {});

    return msg;
  }

  private async uploadAudioToCloudinary(
    audioBase64: string,
    mimeType: string,
    userId: string,
  ): Promise<string> {
    const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey     = process.env.CLOUDINARY_API_KEY;
    const apiSecret  = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return `data:${mimeType};base64,${audioBase64.slice(0, 100)}…`;
    }

    const dataUri = `data:${mimeType};base64,${audioBase64}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'voice-notes';
    const publicId = `voice_${userId}_${timestamp}`;

    const crypto = await import('crypto');
    const sigString = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha256').update(sigString).digest('hex');

    const formData = new FormData();
    formData.append('file',       dataUri);
    formData.append('api_key',    apiKey);
    formData.append('timestamp',  timestamp);
    formData.append('signature',  signature);
    formData.append('folder',     folder);
    formData.append('public_id',  publicId);
    formData.append('resource_type', 'video');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: 'POST', body: formData },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }

    const result: CloudinaryUploadResult = await response.json();
    return result.secure_url;
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
      unreadMessages.map((msg: any) =>
        this.prisma.messageReadReceipt.upsert({
          where:  { messageId_userId: { messageId: msg.id, userId } },
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
          where:  { messageId_userId: { messageId, userId } },
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
        chat:     { OR: [{ buyerId: userId }, { sellerId: userId }] },
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
