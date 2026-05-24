import { Brand, VehicleModel, Trim, YearOption } from '../lib/vehicleFilters';
export interface VehicleFilterState {
    brandId: string;
    modelId: string;
    year: string;
    trimId: string;
    brands: Brand[];
    models: VehicleModel[];
    years: YearOption[];
    trims: Trim[];
    loadingBrands: boolean;
    loadingModels: boolean;
    loadingYears: boolean;
    loadingTrims: boolean;
    error: string | null;
    setBrandId: (id: string) => void;
    setModelId: (id: string) => void;
    setYear: (year: string) => void;
    setTrimId: (id: string) => void;
    reset: () => void;
}
export declare function useVehicleFilters(): VehicleFilterState;
