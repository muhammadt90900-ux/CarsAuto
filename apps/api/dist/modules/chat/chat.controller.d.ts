import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getMyChats(req: any): Promise<({
        listing: {
            images: {
                id: string;
                listingId: string;
                order: number;
                url: string;
                isCover: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ListingType;
            status: import(".prisma/client").$Enums.ListingStatus;
            userId: string;
            titleKu: string;
            titleAr: string;
            titleEn: string;
            titleZh: string;
            descriptionKu: string | null;
            descriptionAr: string | null;
            descriptionEn: string | null;
            descriptionZh: string | null;
            price: number;
            currency: string;
            negotiable: boolean;
            locationId: string | null;
            categoryId: string | null;
            partNumber: string | null;
            views: number;
            featured: boolean;
        };
        messages: {
            id: string;
            createdAt: Date;
            type: string;
            chatId: string;
            senderId: string;
            content: string;
            mediaUrl: string | null;
            readAt: Date | null;
        }[];
        buyer: {
            name: string;
            id: string;
            avatar: string;
        };
        seller: {
            name: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        listingId: string;
        buyerId: string;
        sellerId: string;
    })[]>;
    getOrCreate(listingId: string, req: any): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            type: string;
            chatId: string;
            senderId: string;
            content: string;
            mediaUrl: string | null;
            readAt: Date | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        listingId: string;
        buyerId: string;
        sellerId: string;
    }>;
    getMessages(chatId: string): Promise<({
        sender: {
            name: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: string;
        chatId: string;
        senderId: string;
        content: string;
        mediaUrl: string | null;
        readAt: Date | null;
    })[]>;
    send(chatId: string, req: any, body: {
        content: string;
        type?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        chatId: string;
        senderId: string;
        content: string;
        mediaUrl: string | null;
        readAt: Date | null;
    }>;
}
