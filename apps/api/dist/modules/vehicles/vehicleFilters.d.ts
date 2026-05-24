export interface Brand {
    id: number | string;
    name: string;
    nameKu?: string;
    slug?: string;
    logoUrl?: string;
}
export interface VehicleModel {
    id: number | string;
    name: string;
    nameKu?: string;
    brandId: number | string;
}
export interface Trim {
    id: number | string;
    name: string;
    nameKu?: string;
    modelId: number | string;
}
export interface YearOption {
    value: string;
    label: string;
}
export declare function fetchBrands(): Promise<Brand[]>;
export declare function fetchModels(brandId: string | number): Promise<VehicleModel[]>;
export declare function fetchTrims(modelId: string | number, year?: string): Promise<Trim[]>;
export declare function fetchYears(modelId?: string | number): Promise<YearOption[]>;
