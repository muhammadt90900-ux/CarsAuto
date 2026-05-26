import { PrismaService } from '../../common/prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMyNotifications(userId: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        title: string;
        body: string;
        read: boolean;
    }[]>;
    markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    create(userId: string, type: string, title: string, body: string, data?: any): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        title: string;
        body: string;
        read: boolean;
    }>;
    getUnreadCount(userId: string): Promise<number>;
}
