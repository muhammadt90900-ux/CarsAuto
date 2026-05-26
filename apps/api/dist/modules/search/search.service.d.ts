import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SearchService {
    private prisma;
    constructor(prisma: PrismaService);
    search(q: string, options?: {
        type?: string;
        brandId?: string;
        modelId?: string;
        trimId?: string;
        year?: string;
        minYear?: string;
        maxYear?: string;
        condition?: string;
        minPrice?: string;
        maxPrice?: string;
        locationId?: string;
        fuelType?: string;
        transmission?: string;
        color?: string;
        minMileage?: string;
        maxMileage?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            location: {
                id: string;
                nameEn: string;
                nameAr: string;
                nameKu: string;
                nameZh: string;
                country: string;
                governorate: string | null;
                city: string;
                lat: number;
                lng: number;
            };
            vehicleSpec: {
                trim: {
                    name: string;
                    id: string;
                    fuelType: import(".prisma/client").$Enums.FuelType;
                    transmission: import(".prisma/client").$Enums.TransmissionType;
                    bodyType: import(".prisma/client").$Enums.BodyType;
                    engineLabel: string;
                };
                brand: {
                    id: string;
                    nameEn: string;
                    nameAr: string;
                    nameKu: string;
                    logoUrl: string;
                };
                model: {
                    id: string;
                    nameEn: string;
                    nameAr: string;
                    nameKu: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                trimId: string | null;
                brandId: string | null;
                modelId: string | null;
                year: number | null;
                condition: import(".prisma/client").$Enums.ListingCondition | null;
                mileageKm: number | null;
                fuelType: import(".prisma/client").$Enums.FuelType | null;
                transmission: import(".prisma/client").$Enums.TransmissionType | null;
                drivetrain: import(".prisma/client").$Enums.DrivetrainType | null;
                bodyType: import(".prisma/client").$Enums.BodyType | null;
                color: string | null;
                engineLabel: string | null;
                engineCC: number | null;
                powerKw: number | null;
                doors: number | null;
                seats: number | null;
                vin: string | null;
                listingId: string;
            };
            images: {
                id: string;
                listingId: string;
                order: number;
                url: string;
                isCover: boolean;
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
            categoryId: string | null;
            partNumber: string | null;
            views: number;
            featured: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    autocomplete(q: string, limit?: number): Promise<string[]>;
}
