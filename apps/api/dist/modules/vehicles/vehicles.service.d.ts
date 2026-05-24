import { PrismaService } from '../../common/prisma/prisma.service';
import { BrandQueryDto, ModelQueryDto, TrimQueryDto } from './dto/vehicle-query.dto';
export declare class VehiclesService {
    private prisma;
    constructor(prisma: PrismaService);
    /**
     * Returns all active vehicle brands, optionally filtered by a search term.
     * Ordered alphabetically; includes the total listing count per brand so the
     * frontend can show how many cars are available.
     */
    getBrands({ q }: BrandQueryDto): Promise<any>;
    /**
     * Returns all models that belong to a specific brand.
     * Supports an optional search term for typeahead filtering.
     * When the brand changes on the frontend this endpoint is re-called, so the
     * response is always scoped to the selected brandId.
     */
    getModelsByBrand(brandId: string, { q }: ModelQueryDto): Promise<any>;
    /**
     * Returns trims for a given model filtered by year.
     * Trims store a yearStart / yearEnd range, so we find those whose range
     * includes the requested year.  Supports optional text search.
     * When the year changes on the frontend this endpoint is re-called.
     */
    getTrimsByModelAndYear(modelId: string, { year, q }: TrimQueryDto): Promise<any>;
    /**
     * Returns the distinct years available for listings of a given model.
     * Used to populate the year dropdown when a model is selected.
     */
    getYearsByModel(modelId: string): Promise<number[]>;
}
