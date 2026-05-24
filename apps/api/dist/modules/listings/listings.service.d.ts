import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
export declare class ListingsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: {
        type?: string;
        minPrice?: string;
        maxPrice?: string;
        locationId?: string;
        brandId?: string;
        modelId?: string;
        trimId?: string;
        year?: string;
        minYear?: string;
        maxYear?: string;
        condition?: string;
        maxMileage?: string;
        page?: string;
        limit?: string;
    }): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<any>;
    create(data: CreateListingDto & {
        userId: string;
    }): Promise<any>;
    myListings(userId: string): Promise<any>;
    delete(id: string, userId: string): Promise<any>;
}
