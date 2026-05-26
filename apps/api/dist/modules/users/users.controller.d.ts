import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    updateProfile(req: any, data: {
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
