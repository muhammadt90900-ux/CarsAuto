import { PrismaService } from '../../common/prisma/prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(): Promise<{
        totalUsers: any;
        totalListings: any;
        activeListings: any;
        totalReports: any;
    }>;
    getAllUsers(page?: number, limit?: number): Promise<{
        data: any;
        total: any;
    }>;
    getPendingListings(): Promise<any>;
    approveListing(id: string): Promise<any>;
    rejectListing(id: string): Promise<any>;
    getReports(): Promise<any>;
}
