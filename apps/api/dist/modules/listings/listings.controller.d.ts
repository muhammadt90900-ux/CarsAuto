import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
export declare class ListingsController {
    private readonly listingsService;
    constructor(listingsService: ListingsService);
    findAll(query: any): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<any>;
    myListings(req: any): Promise<any>;
    create(req: any, dto: CreateListingDto): Promise<any>;
    delete(id: string, req: any): Promise<any>;
}
