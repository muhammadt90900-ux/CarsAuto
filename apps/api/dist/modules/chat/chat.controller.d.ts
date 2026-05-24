import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getMyChats(req: any): Promise<any>;
    getOrCreate(listingId: string, req: any): Promise<any>;
    getMessages(chatId: string): Promise<any>;
    send(chatId: string, req: any, body: {
        content: string;
        type?: string;
    }): Promise<any>;
}
