import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SearchService {
    private prisma;
    constructor(prisma: PrismaService);
    search(q: string, type?: string, makeId?: string, modelId?: string, yearFrom?: number, yearTo?: number, fuelType?: string, transmission?: string, driveType?: string, bodyType?: string, condition?: string, page?: number, limit?: number): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
