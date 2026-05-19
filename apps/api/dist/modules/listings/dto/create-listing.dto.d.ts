import { ListingType, ListingCondition, Currency } from '@auto-bazaar-pro/types';
export declare class CreateListingDto {
    type: ListingType;
    titleKu: string;
    titleAr: string;
    titleEn: string;
    titleZh: string;
    descriptionKu?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    descriptionZh?: string;
    price: number;
    currency: Currency;
    negotiable?: boolean;
    locationId?: string;
    makeId?: string;
    modelId?: string;
    year?: number;
    condition?: ListingCondition;
    mileage?: number;
    images?: string[];
}
