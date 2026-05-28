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

/** Map userId → Set of socketIds (one user may have multiple tabs open) */
const onlineUsers = new Map<string, Set<string>>();

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
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

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) throw new WsException('Missing token');

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub ?? payload.userId;

      // Track online presence
      if (!onlineUsers.has(client.data.userId)) {
        onlineUsers.set(client.data.userId, new Set());
      }
      onlineUsers.get(client.data.userId)!.add(client.id);

      // Broadcast presence to all rooms the user is in
      this.server.emit('userOnline', { userId: client.data.userId });

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
          this.server.emit('userOffline', { userId, lastSeen: new Date().toISOString() });
        }
      }
    }
    this.logger.log(`Disconnected: ${client.id}`);
  }

  // ---------------------------------------------------------------------------
  // Chat room management
  // ---------------------------------------------------------------------------

  @SubscribeMessage('joinChat')
  handleJoin(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    client.join(chatId);
    client.to(chatId).emit('userJoined', { userId: client.data.userId, chatId });
  }

  @SubscribeMessage('leaveChat')
  handleLeave(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    client.leave(chatId);
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; content: string; type?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
    if (!senderId) throw new WsException('Unauthenticated');

    const message = await this.chatService.sendMessage(data.chatId, senderId, data.content, data.type);

    // Broadcast the new message to everyone in the room
    this.server.to(data.chatId).emit('newMessage', message);

    // Deliver an in-app notification to the other participant
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

        // Push notification to recipient's socket(s) if online
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

  // ---------------------------------------------------------------------------
  // Typing indicators
  // ---------------------------------------------------------------------------

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.chatId).emit('userTyping', { userId: client.data.userId, chatId: data.chatId });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.chatId).emit('userStoppedTyping', { userId: client.data.userId });
  }

  // ---------------------------------------------------------------------------
  // Read receipts
  // ---------------------------------------------------------------------------

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    await this.chatService.markChatRead(data.chatId, userId);
    // Inform the sender their messages were read
    client.to(data.chatId).emit('messagesRead', { chatId: data.chatId, readBy: userId });
  }

  // ---------------------------------------------------------------------------
  // Presence query
  // ---------------------------------------------------------------------------

  @SubscribeMessage('getOnlineStatus')
  handleGetOnlineStatus(
    @MessageBody() userIds: string[],
  ): Record<string, boolean> {
    return Object.fromEntries(userIds.map((id) => [id, onlineUsers.has(id)]));
  }

  // ---------------------------------------------------------------------------
  // Public helpers (called by other services)
  // ---------------------------------------------------------------------------

  /** Push a real-time notification to a specific user if they are connected */
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
