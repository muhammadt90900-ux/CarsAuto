import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        title: string;
        body: string;
        read: boolean;
    }[]>;
    unreadCount(req: any): Promise<number>;
    markAllRead(req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
