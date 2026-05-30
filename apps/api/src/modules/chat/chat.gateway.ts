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

/** Map userId → Set of socketIds */
const onlineUsers = new Map<string, Set<string>>();

// FIX: Per-user in-memory rate limiter for WebSocket messages (10 msg/10s)
const wsMessageRateLimit = new Map<string, { count: number; resetAt: number }>();
const WS_RATE_WINDOW_MS = 10_000;
const WS_RATE_MAX = 10;

function checkWsRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = wsMessageRateLimit.get(userId);
  if (!state || now > state.resetAt) {
    wsMessageRateLimit.set(userId, { count: 1, resetAt: now + WS_RATE_WINDOW_MS });
    return true;
  }
  if (state.count >= WS_RATE_MAX) return false;
  state.count++;
  return true;
}

@WebSocketGateway({
  cors: {
    // FIX: Only allow configured origin(s), not a wildcard
    origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim()),
    credentials: true,
  },
  namespace: '/chat',
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

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) throw new WsException('Missing token');

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub ?? payload.userId;

      if (!onlineUsers.has(client.data.userId)) {
        onlineUsers.set(client.data.userId, new Set());
      }
      onlineUsers.get(client.data.userId)!.add(client.id);

      // FIX: Emit userOnline only to the user's own rooms, not to ALL connections
      // This prevents leaking presence data to strangers
      client.emit('connected', { userId: client.data.userId });

      this.logger.log(`Connected: ${client.id} (user ${client.data.userId})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          // FIX: Only emit to the user's own rooms (rooms they joined), not broadcast globally
          client.rooms.forEach(room => {
            client.to(room).emit('userOffline', { userId, lastSeen: new Date().toISOString() });
          });
        }
      }
    }
    this.logger.log(`Disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinChat')
  handleJoin(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    // FIX: Validate chatId is a reasonable string before joining room
    if (typeof chatId !== 'string' || chatId.length > 40) return;
    client.join(chatId);
    client.to(chatId).emit('userJoined', { userId: client.data.userId, chatId });
  }

  @SubscribeMessage('leaveChat')
  handleLeave(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    client.leave(chatId);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; content: string; type?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
    if (!senderId) throw new WsException('Unauthenticated');

    // FIX: Rate limit WebSocket messages to prevent spam/DoS
    if (!checkWsRateLimit(senderId)) {
      throw new WsException('Rate limit exceeded — slow down');
    }

    // FIX: Validate content length at WebSocket layer too
    if (!data.content || typeof data.content !== 'string' || data.content.length > 4000) {
      throw new WsException('Invalid message content');
    }

    const message = await this.chatService.sendMessageSecure(data.chatId, senderId, data.content, data.type);
    this.server.to(data.chatId).emit('newMessage', message);

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
        const recipientSockets = onlineUsers.get(otherUserId);
        if (recipientSockets) {
          recipientSockets.forEach((socketId) => {
            this.server.to(socketId).emit('notification', notification);
          });
        }
      }
    } catch (err) {
      this.logger.error('Failed to deliver notification', err);
    }

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.chatId).emit('userTyping', { userId: client.data.userId, chatId: data.chatId });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.chatId).emit('userStoppedTyping', { userId: client.data.userId });
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.chatService.markChatRead(data.chatId, userId);
    client.to(data.chatId).emit('messagesRead', { chatId: data.chatId, readBy: userId });
  }

  @SubscribeMessage('getOnlineStatus')
  handleGetOnlineStatus(@MessageBody() userIds: string[]): Record<string, boolean> {
    // FIX: Limit the number of user IDs that can be queried at once
    if (!Array.isArray(userIds) || userIds.length > 50) return {};
    return Object.fromEntries(userIds.map((id) => [id, onlineUsers.has(id)]));
  }

  pushNotification(userId: string, notification: unknown) {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => this.server.to(socketId).emit('notification', notification));
    }
  }

  isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId);
  }
}
