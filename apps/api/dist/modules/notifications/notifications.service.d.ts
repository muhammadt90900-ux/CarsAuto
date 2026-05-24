import { PrismaService } from '../../common/prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMyNotifications(userId: string): Promise<any>;
    markAllRead(userId: string): Promise<any>;
    create(userId: string, type: string, title: string, body: string, data?: any): Promise<any>;
    getUnreadCount(userId: string): Promise<any>;
}
