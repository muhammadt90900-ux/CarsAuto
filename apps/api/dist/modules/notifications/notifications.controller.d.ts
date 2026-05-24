import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getAll(req: any): Promise<any>;
    unreadCount(req: any): Promise<any>;
    markAllRead(req: any): Promise<any>;
}
