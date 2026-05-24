import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        totalUsers: any;
        totalListings: any;
        activeListings: any;
        totalReports: any;
    }>;
    getUsers(page: string, limit: string): Promise<{
        data: any;
        total: any;
    }>;
    getPending(): Promise<any>;
    approve(id: string): Promise<any>;
    reject(id: string): Promise<any>;
    getReports(): Promise<any>;
}
