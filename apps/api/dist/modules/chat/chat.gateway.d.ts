import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private chatService;
    server: Server;
    constructor(chatService: ChatService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoin(chatId: string, client: Socket): void;
    handleMessage(data: {
        chatId: string;
        senderId: string;
        content: string;
        type?: string;
    }, client: Socket): Promise<void>;
    handleTyping(data: {
        chatId: string;
        userId: string;
    }, client: Socket): void;
}
