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
const TYPING_TIMEOUT_MS = 5_000; // server-side safety net

// ─── Message delivery tracking ───────────────────────────────────────────────
/**
 * Pending acknowledgement slots.
 * key: `${chatId}:${tempId}`  value: { resolve, timer }
 * A client assigns a client-generated tempId and waits for an ACK.
 */
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

// ─── Gateway ─────────────────────────────────────────────────────────────────
@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim()),
    credentials: true,
  },
  namespace: '/chat',
  // Reconnection-friendly: allow both transports so clients can downgrade
  transports: ['websocket', 'polling'],
  pingInterval: 25_000,
  pingTimeout: 20_000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

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

      const payload = this.jwtService.verify(token);
      const userId: string = payload.sub ?? payload.userId;
      client.data.userId = userId;

      // Track presence
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(client.id);

      // Confirm connection + send any missed messages (delivery guarantee)
      client.emit('connected', {
        userId,
        serverTime: Date.now(),
      });

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
        // Broadcast offline only to rooms this socket was in
        client.rooms.forEach((room) => {
          client.to(room).emit('userOffline', {
            userId,
            lastSeen: new Date().toISOString(),
          });
        });
      }
    }

    // Clear any typing state this socket held
    typingTimers.forEach((timer, key) => {
      if (key.endsWith(`:${userId}`)) {
        clearTimeout(timer);
        typingTimers.delete(key);
        const chatId = key.split(':')[0];
        this.server.to(chatId).emit('userStoppedTyping', { userId, chatId });
      }
    });

    this.logger.log(`Disconnected: ${client.id} (user ${userId})`);
  }

  // ─── Room management ───────────────────────────────────────────────────────

  @SubscribeMessage('joinChat')
  handleJoin(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    if (typeof chatId !== 'string' || chatId.length > 40) return;
    client.join(chatId);
    client.to(chatId).emit('userJoined', { userId: client.data.userId, chatId });

    // Send current online status of all room members to the joining client
    const userId: string = client.data.userId;
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
    // Clear typing if they were typing in this chat
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

    // Broadcast immediately only on first event; subsequent ones just reset the timer
    if (!typingTimers.has(key)) {
      client
        .to(data.chatId)
        .emit('userTyping', { userId, chatId: data.chatId, startedAt: Date.now() });
    }

    // Reset server-side safety-net timer
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

  // ─── Message sending with delivery guarantees ──────────────────────────────

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: { chatId: string; content: string; type?: string; tempId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId: string = client.data.userId;
    if (!senderId) throw new WsException('Unauthenticated');

    // Rate limiting
    if (!checkWsRateLimit(senderId)) {
      client.emit('messageError', { tempId: data.tempId, error: 'Rate limit exceeded — slow down' });
      return;
    }

    // Validate
    if (!data.content || typeof data.content !== 'string' || data.content.length > 4000) {
      client.emit('messageError', { tempId: data.tempId, error: 'Invalid message content' });
      return;
    }

    // Stop typing since they sent
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

    // Delivery acknowledgement back to sender (with tempId mapping)
    const ack = { ...message, tempId: data.tempId, status: 'sent' };
    client.emit('messageSent', ack);

    // Broadcast to all participants in the room (excluding sender to avoid double render)
    client.to(data.chatId).emit('newMessage', { ...message, status: 'delivered' });

    // Resolve any pending delivery promise for this tempId
    if (data.tempId) {
      const slot = pendingDelivery.get(`${data.chatId}:${data.tempId}`);
      if (slot) {
        clearTimeout(slot.timer);
        slot.resolve(message.id as string);
        pendingDelivery.delete(`${data.chatId}:${data.tempId}`);
      }
    }

    // Notify recipient with in-app notification
    try {
      const otherUserId = await this.chatService.getOtherParticipant(data.chatId, senderId);
      if (otherUserId) {
        const notification = await this.notificationsService.create(
          otherUserId,
          'new_message',
          'New message',
          data.content.length > 60 ? `${data.content.slice(0, 60)}…` : data.content,
          { chatId: data.chatId, senderId },
        );

        // Push real-time notification if recipient is online
        const recipientSockets = onlineUsers.get(otherUserId);
        if (recipientSockets) {
          recipientSockets.forEach((socketId) => {
            this.server.to(socketId).emit('notification', notification);
            // Also emit delivery status update to recipient's other sockets
            this.server.to(socketId).emit('messageDelivered', {
              messageId: message.id,
              chatId: data.chatId,
              deliveredAt: new Date().toISOString(),
            });
          });
        }
      }
    } catch (err) {
      this.logger.error('Failed to deliver notification', err);
    }

    return message;
  }

  // ─── Read receipts ─────────────────────────────────────────────────────────

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody() data: { chatId: string; messageIds?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId: string = client.data.userId;
    if (!data?.chatId) return;

    await this.chatService.markChatRead(data.chatId, userId);

    // Broadcast read receipt to other participants with timestamp
    client.to(data.chatId).emit('messagesRead', {
      chatId: data.chatId,
      readBy: userId,
      readAt: new Date().toISOString(),
      messageIds: data.messageIds ?? null, // null = all messages in chat
    });

    // Confirm back to sender
    client.emit('markReadAck', {
      chatId: data.chatId,
      readAt: new Date().toISOString(),
    });
  }

  // ─── Presence ──────────────────────────────────────────────────────────────

  @SubscribeMessage('getOnlineStatus')
  handleGetOnlineStatus(
    @MessageBody() userIds: string[],
    @ConnectedSocket() client: Socket,
  ): Record<string, boolean | string> {
    if (!Array.isArray(userIds) || userIds.length > 50) return {};
    // Return boolean presence + last-seen placeholder
    return Object.fromEntries(
      userIds.map((id) => [id, onlineUsers.has(id)]),
    );
  }

  // ─── Reconnection: replay missed events ────────────────────────────────────

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

  // ─── Public API for other services ─────────────────────────────────────────

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
