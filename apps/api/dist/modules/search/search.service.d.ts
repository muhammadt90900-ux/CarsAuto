import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SearchService {
    private prisma;
    constructor(prisma: PrismaService);
    search(q: string, type?: string, page?: number, limit?: number): Promise<{
        data: ({
            location: {
                id: string;
                country: string;
                governorate: string | null;
                city: string;
                nameKu: string;
                nameAr: string;
                nameEn: string;
                nameZh: string;
                lat: number;
                lng: number;
            };
            images: {
                id: string;
                url: string;
                listingId: string;
                isCover: boolean;
                order: number;
            }[];
        } & {
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
            views: number;
            featured: boolean;
            makeId: string | null;
            modelId: string | null;
            year: number | null;
            bodyType: string | null;
            condition: import(".prisma/client").$Enums.ListingCondition | null;
            mileage: number | null;
            color: string | null;
            fuelType: string | null;
            transmission: string | null;
            engineSize: number | null;
            driveType: string | null;
            doors: number | null;
            seats: number | null;
            features: string[];
            engineCC: number | null;
            categoryId: string | null;
            partNumber: string | null;
            compatibleMakes: string[];
            compatibleModels: string[];
            compatibleYearsFrom: number | null;
            compatibleYearsTo: number | null;
            quantity: number | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
