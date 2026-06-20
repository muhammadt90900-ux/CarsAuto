import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Presence ────────────────────────────────────────────────────────────────
/** userId → Set<socketId> */
const onlineUsers = new Map<string, Set<string>>();

// ─── Typing ──────────────────────────────────────────────────────────────────
/** `${chatId}:${userId}` → auto-clear timer */
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const TYPING_TIMEOUT_MS = 5_000;

// ─── Message delivery tracking ───────────────────────────────────────────────
const pendingDelivery = new Map<
  string,
  { resolve: (msgId: string) => void; timer: ReturnType<typeof setTimeout> }
>();
const DELIVERY_TIMEOUT_MS = 8_000;

// ─── Rate limiting ───────────────────────────────────────────────────────────
const wsRateLimiter = new Map<string, { count: number; resetAt: number }>();
const WS_RATE_WINDOW_MS = 10_000;
const WS_RATE_MAX = 10;

function checkWsRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = wsRateLimiter.get(userId);
  if (!state || now > state.resetAt) {
    wsRateLimiter.set(userId, { count: 1, resetAt: now + WS_RATE_WINDOW_MS });
    return true;
  }
  if (state.count >= WS_RATE_MAX) return false;
  state.count++;
  return true;
}

// ─── Voice note rate limiting (separate, stricter) ───────────────────────────
// Voice notes are more expensive to process — 3 per 60 s
const voiceRateLimiter = new Map<string, { count: number; resetAt: number }>();
const VOICE_RATE_WINDOW_MS = 60_000;
const VOICE_RATE_MAX = 3;

function checkVoiceRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = voiceRateLimiter.get(userId);
  if (!state || now > state.resetAt) {
    voiceRateLimiter.set(userId, { count: 1, resetAt: now + VOICE_RATE_WINDOW_MS });
    return true;
  }
  if (state.count >= VOICE_RATE_MAX) return false;
  state.count++;
  return true;
}

// ─── Gateway ─────────────────────────────────────────────────────────────────

@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim()),
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  pingInterval: 25_000,
  pingTimeout: 20_000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
  ) {}

  // ─── Connection ────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) throw new WsException('Missing token');

      const payload = this.jwtService.verify(token, {
        issuer:   'car-platform',
        audience: 'car-platform-client',
      });
      const userId: string = payload.sub ?? payload.userId;
      client.data.userId = userId;

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(client.id);

      client.emit('connected', { userId, serverTime: Date.now() });

      this.logger.log(`Connected: ${client.id} (user ${userId})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data.userId;
    if (!userId) return;

    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        client.rooms.forEach((room) => {
          client.to(room).emit('userOffline', {
            userId,
            lastSeen: new Date().toISOString(),
          });
        });
      }
    }

    typingTimers.forEach((timer, key) => {
      if (key.endsWith(`:${userId}`)) {
        clearTimeout(timer);
        typingTimers.delete(key);
        const chatId = key.split(':')[0];
        if (chatId) this.server.to(chatId).emit('userStoppedTyping', { userId, chatId });
      }
    });

    this.logger.log(`Disconnected: ${client.id} (user ${userId})`);
  }

  // ─── Room management ───────────────────────────────────────────────────────

  @SubscribeMessage('joinChat')
  async handleJoin(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    if (typeof chatId !== 'string' || chatId.length > 40) return;
    const userId: string = client.data.userId;
    // F5 fix: verify the caller is a participant before joining the Socket.IO room.
    // Without this check, any authenticated user who knows the chatId can silently
    // receive all future messages broadcast to this room.
    try {
      await this.chatService.assertMembershipPublic(chatId, userId);
    } catch {
      client.emit('joinError', { chatId, error: 'Not a participant in this chat' });
      return;
    }
    client.join(chatId);
    client.to(chatId).emit('userJoined', { userId: client.data.userId, chatId });

    const roomClients = this.server.sockets.adapter.rooms.get(chatId);
    const onlineInRoom: string[] = [];
    if (roomClients) {
      roomClients.forEach((sid) => {
        const s = this.server.sockets.sockets.get(sid);
        if (s?.data.userId && s.data.userId !== userId) {
          onlineInRoom.push(s.data.userId);
        }
      });
    }
    if (onlineInRoom.length > 0) {
      client.emit('presenceSync', { chatId, onlineUsers: onlineInRoom });
    }
  }

  @SubscribeMessage('leaveChat')
  handleLeave(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    if (typeof chatId !== 'string' || chatId.length > 40) return;
    client.leave(chatId);
    this._clearTyping(chatId, client.data.userId);
  }

  // ─── Typing indicators ─────────────────────────────────────────────────────

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.chatId || typeof data.chatId !== 'string') return;
    const userId: string = client.data.userId;
    const key = `${data.chatId}:${userId}`;

    if (!typingTimers.has(key)) {
      client
        .to(data.chatId)
        .emit('userTyping', { userId, chatId: data.chatId, startedAt: Date.now() });
    }

    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    typingTimers.set(
      key,
      setTimeout(() => {
        this._clearTyping(data.chatId, userId);
        client.to(data.chatId).emit('userStoppedTyping', { userId, chatId: data.chatId });
      }, TYPING_TIMEOUT_MS),
    );
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.chatId) return;
    const userId: string = client.data.userId;
    this._clearTyping(data.chatId, userId);
    client.to(data.chatId).emit('userStoppedTyping', { userId, chatId: data.chatId });
  }

  private _clearTyping(chatId: string, userId: string) {
    const key = `${chatId}:${userId}`;
    const timer = typingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      typingTimers.delete(key);
    }
  }

  // ─── Text message sending ──────────────────────────────────────────────────

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: { chatId: string; content: string; type?: string; tempId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId: string = client.data.userId;
    if (!senderId) throw new WsException('Unauthenticated');

    if (!checkWsRateLimit(senderId)) {
      client.emit('messageError', { tempId: data.tempId, error: 'Rate limit exceeded — slow down' });
      return;
    }

    if (!data.content || typeof data.content !== 'string' || data.content.length > 4000) {
      client.emit('messageError', { tempId: data.tempId, error: 'Invalid message content' });
      return;
    }

    if (data.chatId) this._clearTyping(data.chatId, senderId);

    let message: Record<string, unknown>;
    try {
      message = await this.chatService.sendMessageSecure(
        data.chatId,
        senderId,
        data.content,
        data.type,
      ) as Record<string, unknown>;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Send failed';
      client.emit('messageError', { tempId: data.tempId, error: errorMsg });
      return;
    }

    const ack = { ...message, tempId: data.tempId, status: 'sent' };
    client.emit('messageSent', ack);
    client.to(data.chatId).emit('newMessage', { ...message, status: 'delivered' });

    if (data.tempId) {
      const slot = pendingDelivery.get(`${data.chatId}:${data.tempId}`);
      if (slot) {
        clearTimeout(slot.timer);
        slot.resolve(message.id as string);
        pendingDelivery.delete(`${data.chatId}:${data.tempId}`);
      }
    }

    await this._notifyRecipient(data.chatId, senderId, message, data.content.slice(0, 60));

    return message;
  }

  // ─── Voice Note (Feature 6) ────────────────────────────────────────────────

  /**
   * Handles the `sendVoiceNote` Socket.io event.
   *
   * Client payload:
   * ```json
   * {
   *   "chatId":      "uuid",
   *   "audioBase64": "<base64 string, max 2 MB>",
   *   "duration":    23,
   *   "mimeType":    "audio/webm",
   *   "tempId":      "client-generated-id"
   * }
   * ```
   *
   * Flow:
   * 1. Auth + rate-limit check (3 voice notes / 60 s per user)
   * 2. Validate size ≤ 2 MB, duration ≤ 120 s
   * 3. Upload to Cloudinary (resource_type: 'video', folder: 'voice-notes')
   * 4. Persist Message with messageType='voice', audioUrl, audioDuration
   * 5. Emit `voiceNoteSent` ACK to sender
   * 6. Broadcast `newMessage` (with voice payload) to other participants
   * 7. Push in-app notification to recipient if online
   */
  @SubscribeMessage('sendVoiceNote')
  async handleVoiceNote(
    @MessageBody()
    data: {
      chatId:      string;
      audioBase64: string;
      duration:    number;
      mimeType:    'audio/webm' | 'audio/mp4' | 'audio/ogg';
      tempId?:     string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId: string = client.data.userId;
    if (!senderId) throw new WsException('Unauthenticated');

    // ── Rate limit: stricter for voice (uploads are expensive) ───────────────
    if (!checkVoiceRateLimit(senderId)) {
      client.emit('voiceNoteError', {
        tempId: data.tempId,
        error: 'Too many voice notes — please wait a moment',
      });
      return;
    }

    // ── Basic field validation ────────────────────────────────────────────────
    if (
      !data.chatId ||
      typeof data.chatId !== 'string' ||
      typeof data.audioBase64 !== 'string' ||
      !data.audioBase64
    ) {
      client.emit('voiceNoteError', { tempId: data.tempId, error: 'Invalid payload' });
      return;
    }

    let message: Record<string, unknown>;
    try {
      message = await this.chatService.sendVoiceNote(data.chatId, senderId, {
        audioBase64: data.audioBase64,
        duration:    data.duration,
        mimeType:    data.mimeType,
      }) as Record<string, unknown>;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Voice note failed';
      this.logger.error(`[voice] sendVoiceNote failed for user ${senderId}: ${errorMsg}`);
      client.emit('voiceNoteError', { tempId: data.tempId, error: errorMsg });
      return;
    }

    // ── ACK to sender ─────────────────────────────────────────────────────────
    client.emit('voiceNoteSent', { ...message, tempId: data.tempId, status: 'sent' });

    // ── Broadcast to other participants ───────────────────────────────────────
    client.to(data.chatId).emit('newMessage', { ...message, status: 'delivered' });

    // ── In-app notification to recipient ─────────────────────────────────────
    await this._notifyRecipient(data.chatId, senderId, message, '🎤 Voice note');

    return message;
  }

  // ─── Shared notification helper ────────────────────────────────────────────

  private async _notifyRecipient(
    chatId: string,
    senderId: string,
    message: Record<string, unknown>,
    preview: string,
  ) {
    try {
      const otherUserId = await this.chatService.getOtherParticipant(chatId, senderId);
      if (!otherUserId) return;

      const notification = await this.notificationsService.create(
        otherUserId,
        'new_message',
        'New message',
        preview,
        { chatId, senderId },
      );

      const recipientSockets = onlineUsers.get(otherUserId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          this.server.to(socketId).emit('notification', notification);
          this.server.to(socketId).emit('messageDelivered', {
            messageId: message.id,
            chatId,
            deliveredAt: new Date().toISOString(),
          });
        });
      }
    } catch (err) {
      this.logger.error('Failed to deliver notification', err);
    }
  }

  // ─── Read receipts ─────────────────────────────────────────────────────────

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody() data: { chatId: string; messageIds?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId: string = client.data.userId;
    if (!data?.chatId) return;

    // F5 fix: membership is enforced inside markChatRead (assertMembership call),
    // so non-participants receive a ForbiddenException rather than silently succeeding.
    try {
      await this.chatService.markChatRead(data.chatId, userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Access denied';
      client.emit('markReadError', { chatId: data.chatId, error: msg });
      return;
    }

    client.to(data.chatId).emit('messagesRead', {
      chatId:     data.chatId,
      readBy:     userId,
      readAt:     new Date().toISOString(),
      messageIds: data.messageIds ?? null,
    });

    client.emit('markReadAck', { chatId: data.chatId, readAt: new Date().toISOString() });
  }

  // ─── Presence ──────────────────────────────────────────────────────────────

  @SubscribeMessage('getOnlineStatus')
  handleGetOnlineStatus(
    @MessageBody() userIds: string[],
    @ConnectedSocket() client: Socket,
  ): Record<string, boolean | string> {
    if (!Array.isArray(userIds) || userIds.length > 50) return {};
    return Object.fromEntries(userIds.map((id) => [id, onlineUsers.has(id)]));
  }

  // ─── Reconnection ──────────────────────────────────────────────────────────

  @SubscribeMessage('catchUp')
  async handleCatchUp(
    @MessageBody() data: { chatId: string; since: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId: string = client.data.userId;
    if (!data?.chatId || !data?.since) return;

    const since = new Date(data.since);
    if (isNaN(since.getTime())) return;

    try {
      const missed = await this.chatService.getMessagesSince(data.chatId, userId, since);
      if (missed.length > 0) {
        client.emit('missedMessages', { chatId: data.chatId, messages: missed });
      }
    } catch (err) {
      this.logger.error('catchUp failed', err);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  pushNotification(userId: string, notification: unknown) {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.forEach((socketId) =>
        this.server.to(socketId).emit('notification', notification),
      );
    }
  }

  isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }
}
