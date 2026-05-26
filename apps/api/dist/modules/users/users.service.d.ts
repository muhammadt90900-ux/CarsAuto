import { PrismaService } from '../../common/prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        avatar: string;
        role: import(".prisma/client").$Enums.UserRole;
        verified: boolean;
        locale: string;
        createdAt: Date;
        listings: {
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
        }[];
    }>;
    updateProfile(id: string, data: {
        name?: string;
        phone?: string;
        locale?: string;
        avatar?: string;
    }): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        avatar: string;
        locale: string;
    }>;
}
