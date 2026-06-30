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
import { CacheService } from '../../common/cache/cache.service';

// ─── Presence ────────────────────────────────────────────────────────────────
//
// F-CRIT fix: was `Map<string, Set<string>>` (userId → Set<socketId>) at
// module scope. That only ever reflected sockets connected to *this*
// replica, so a user connected to replica A appeared "offline" to anyone
// whose query landed on replica B. Now backed by a Redis SET per user
// (key "online:{userId}"), shared across all replicas, with a 60s TTL
// refreshed every 30s for as long as the socket stays connected — so a
// crashed replica's sockets self-expire instead of leaving phantom presence.
const PRESENCE_TTL_MS = 60_000;
const PRESENCE_REFRESH_MS = 30_000;

// ─── Typing ──────────────────────────────────────────────────────────────────
//
// F-CRIT fix: the "is this user already marked as typing" flag is now a
// Redis key ("typing:{chatId}:{userId}", 5s TTL) so it stays consistent even
// if a user's connection moves to a different replica mid-session. The
// *proactive* "stopped typing" emission after 5s of silence remains a
// per-connection timer stored on `client.data` (not a module-level Map) —
// this is connection-scoped state, not shared mutable global state, so it
// doesn't have the cross-replica correctness problem the other globals had.
const TYPING_TIMEOUT_MS = 5_000;

// ─── Message delivery tracking ───────────────────────────────────────────────
// Kept in-memory per the fix spec: this tracks in-flight acks for the
// lifetime of a single connection and is never read by another replica.
const pendingDelivery = new Map<
  string,
  { resolve: (msgId: string) => void; timer: ReturnType<typeof setTimeout> }
>();
const DELIVERY_TIMEOUT_MS = 8_000;

// ─── Rate limiting ───────────────────────────────────────────────────────────
//
// F-CRIT fix: were module-level `Map<string, {count, resetAt}>`. A user with
// sockets open against two different replicas (e.g. two browser tabs/devices
// routed to different instances) could get 2x the intended rate limit, since
// each replica counted independently. Now a single Redis INCR-with-TTL
// counter per user, shared across all replicas.
const WS_RATE_WINDOW_MS = 10_000;
const WS_RATE_MAX = 10;

// Voice notes are more expensive to process — 3 per 60 s, separate counter.
const VOICE_RATE_WINDOW_MS = 60_000;
const VOICE_RATE_MAX = 3;

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
    private cache: CacheService,
  ) {}

  // ─── Rate limit helpers ─────────────────────────────────────────────────────

  private async checkWsRateLimit(userId: string): Promise<boolean> {
    const count = await this.cache.incrWithTtl(`wsrl:${userId}`, WS_RATE_WINDOW_MS);
    return count <= WS_RATE_MAX;
  }

  private async checkVoiceRateLimit(userId: string): Promise<boolean> {
    const count = await this.cache.incrWithTtl(`voicerl:${userId}`, VOICE_RATE_WINDOW_MS);
    return count <= VOICE_RATE_MAX;
  }

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

      await this.cache.addToSet(`online:${userId}`, client.id, PRESENCE_TTL_MS);

      // Heartbeat: keep the presence TTL alive for as long as this socket is
      // connected, even if the user is idle (no typing/messages). Cleared on disconnect.
      client.data.presenceInterval = setInterval(() => {
        this.cache.addToSet(`online:${userId}`, client.id, PRESENCE_TTL_MS).catch(() => {});
      }, PRESENCE_REFRESH_MS);

      // Per-connection typing-stop timers (see "Typing" comment above).
      client.data.typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

      client.emit('connected', { userId, serverTime: Date.now() });

      this.logger.log(`Connected: ${client.id} (user ${userId})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data.userId;
    if (!userId) return;

    if (client.data.presenceInterval) {
      clearInterval(client.data.presenceInterval);
    }

    await this.cache.removeFromSet(`online:${userId}`, client.id);
    const stillOnline = await this.cache.exists(`online:${userId}`);
    if (!stillOnline) {
      client.rooms.forEach((room) => {
        client.to(room).emit('userOffline', {
          userId,
          lastSeen: new Date().toISOString(),
        });
      });
    }

    const typingTimers: Map<string, ReturnType<typeof setTimeout>> | undefined =
      client.data.typingTimers;
    if (typingTimers) {
      for (const [chatId, timer] of typingTimers) {
        clearTimeout(timer);
        await this.cache.del(`typing:${chatId}:${userId}`);
        this.server.to(chatId).emit('userStoppedTyping', { userId, chatId });
      }
      typingTimers.clear();
    }

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
  async handleLeave(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    if (typeof chatId !== 'string' || chatId.length > 40) return;
    client.leave(chatId);
    await this._clearTyping(chatId, client.data.userId, client);
  }

  // ─── Typing indicators ─────────────────────────────────────────────────────

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.chatId || typeof data.chatId !== 'string') return;
    const userId: string = client.data.userId;
    const redisKey = `typing:${data.chatId}:${userId}`;

    const alreadyTyping = await this.cache.exists(redisKey);
    if (!alreadyTyping) {
      client
        .to(data.chatId)
        .emit('userTyping', { userId, chatId: data.chatId, startedAt: Date.now() });
    }
    await this.cache.set(redisKey, 1, TYPING_TIMEOUT_MS);

    const typingTimers: Map<string, ReturnType<typeof setTimeout>> = client.data.typingTimers;
    const existing = typingTimers.get(data.chatId);
    if (existing) clearTimeout(existing);

    typingTimers.set(
      data.chatId,
      setTimeout(() => {
        this._clearTyping(data.chatId, userId, client);
        client.to(data.chatId).emit('userStoppedTyping', { userId, chatId: data.chatId });
      }, TYPING_TIMEOUT_MS),
    );
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.chatId) return;
    const userId: string = client.data.userId;
    await this._clearTyping(data.chatId, userId, client);
    client.to(data.chatId).emit('userStoppedTyping', { userId, chatId: data.chatId });
  }

  private async _clearTyping(chatId: string, userId: string, client: Socket) {
    const typingTimers: Map<string, ReturnType<typeof setTimeout>> | undefined =
      client.data.typingTimers;
    const timer = typingTimers?.get(chatId);
    if (timer) {
      clearTimeout(timer);
      typingTimers!.delete(chatId);
    }
    await this.cache.del(`typing:${chatId}:${userId}`);
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

    if (!(await this.checkWsRateLimit(senderId))) {
      client.emit('messageError', { tempId: data.tempId, error: 'Rate limit exceeded — slow down' });
      return;
    }

    if (!data.content || typeof data.content !== 'string' || data.content.length > 4000) {
      client.emit('messageError', { tempId: data.tempId, error: 'Invalid message content' });
      return;
    }

    if (data.chatId) await this._clearTyping(data.chatId, senderId, client);

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
    if (!(await this.checkVoiceRateLimit(senderId))) {
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

      const recipientSockets = await this.cache.setMembers(`online:${otherUserId}`);
      recipientSockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
        this.server.to(socketId).emit('messageDelivered', {
          messageId: message.id,
          chatId,
          deliveredAt: new Date().toISOString(),
        });
      });
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
  async handleGetOnlineStatus(
    @MessageBody() userIds: string[],
    @ConnectedSocket() client: Socket,
  ): Promise<Record<string, boolean | string>> {
    if (!Array.isArray(userIds) || userIds.length > 50) return {};
    const entries = await Promise.all(
      userIds.map(async (id) => [id, await this.cache.exists(`online:${id}`)] as const),
    );
    return Object.fromEntries(entries);
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

  async pushNotification(userId: string, notification: unknown): Promise<void> {
    const sockets = await this.cache.setMembers(`online:${userId}`);
    sockets.forEach((socketId) =>
      this.server.to(socketId).emit('notification', notification),
    );
  }

  async isUserOnline(userId: string): Promise<boolean> {
    return this.cache.exists(`online:${userId}`);
  }
}