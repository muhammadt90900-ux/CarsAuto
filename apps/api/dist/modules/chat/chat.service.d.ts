import { PrismaService } from '../../common/prisma/prisma.service';
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrCreateChat(listingId: string, buyerId: string): Promise<any>;
    getMyChats(userId: string): Promise<any>;
    sendMessage(chatId: string, senderId: string, content: string, type?: string): Promise<any>;
    getChatMessages(chatId: string): Promise<any>;
}
