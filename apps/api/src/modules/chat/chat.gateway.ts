import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinChat')
  handleJoin(@MessageBody() chatId: string, @ConnectedSocket() client: Socket) {
    client.join(chatId);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { chatId: string; senderId: string; content: string; type?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.chatService.sendMessage(
      data.chatId, data.senderId, data.content, data.type,
    );
    this.server.to(data.chatId).emit('newMessage', message);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.chatId).emit('userTyping', { userId: data.userId });
  }
}
