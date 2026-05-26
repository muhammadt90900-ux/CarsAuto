import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
export declare class ListingsController {
    private readonly listingsService;
    constructor(listingsService: ListingsService);
    /** GET /listings — public paginated list with filters */
    findAll(query: any): Promise<{
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
            user: {
                name: string;
                id: string;
                avatar: string;
                verified: boolean;
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
    /** GET /listings/my — authenticated user's own listings */
    myListings(req: any): Promise<({
        vehicleSpec: {
            brand: {
                id: string;
                nameEn: string;
                logoUrl: string;
            };
            model: {
                id: string;
                nameEn: string;
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
    })[]>;
    /** GET /listings/:id — single listing detail + view increment */
    findOne(id: string): Promise<{
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
        user: {
            name: string;
            phone: string;
            id: string;
            avatar: string;
            verified: boolean;
        };
        vehicleSpec: {
            trim: {
                name: string;
                id: string;
                fuelType: import(".prisma/client").$Enums.FuelType;
                transmission: import(".prisma/client").$Enums.TransmissionType;
                drivetrain: import(".prisma/client").$Enums.DrivetrainType;
                bodyType: import(".prisma/client").$Enums.BodyType;
                engineLabel: string;
                engineCC: number;
                powerKw: number;
                doors: number;
                seats: number;
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
    }>;
    /** POST /listings — create a new listing */
    create(req: any, dto: CreateListingDto): Promise<{
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
    }>;
    /** PATCH /listings/:id — partial update (owner only) */
    update(id: string, req: any, dto: Partial<CreateListingDto>): Promise<{
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
    }>;
    /** DELETE /listings/:id — soft or hard delete (owner only) */
    delete(id: string, req: any): Promise<{
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
    }>;
}
