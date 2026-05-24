import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(q: string, type: string, makeId: string, modelId: string, yearFrom: string, yearTo: string, fuelType: string, transmission: string, driveType: string, bodyType: string, condition: string, page: string, limit: string): Promise<{
        data: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
