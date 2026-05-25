// apps/web/src/lib/vehicleFilters.ts
// Dynamic filter data fetched from the API — no hardcoded options

import { api } from './api';

export interface Brand {
  id: number | string;
  name: string;      // e.g. "Toyota"
  nameKu?: string;   // e.g. "تۆیۆتا"
  nameAr?: string;
  nameZh?: string;
  slug?: string;
  logoUrl?: string;
}

export interface VehicleModel {
  id: number | string;
  name: string;
  nameKu?: string;
  nameAr?: string;
  brandId: number | string;
}

export interface Trim {
  id: number | string;
  name: string;
  nameKu?: string;
  modelId: number | string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  drivetrain?: string;
  engineLabel?: string;
}

export interface YearOption {
  value: string; // "2024"
  label: string; // "2024"
}

export interface Location {
  id: string;
  city: string;
  governorate?: string;
  country: string;
  nameKu: string;
  nameAr: string;
  nameEn: string;
}

export interface SearchFilters {
  q?: string;
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
}

// ── Brands ───────────────────────────────────────────────────────
export async function fetchBrands(): Promise<Brand[]> {
  const { data } = await api.get<Brand[]>('/vehicles/brands');
  return data;
}

// ── Models (depends on brand) ────────────────────────────────────
export async function fetchModels(brandId: string | number): Promise<VehicleModel[]> {
  const { data } = await api.get<VehicleModel[]>('/vehicles/models', {
    params: { brandId },
  });
  return data;
}

// ── Trims (depends on model + optional year) ─────────────────────
export async function fetchTrims(
  modelId: string | number,
  year?: string,
): Promise<Trim[]> {
  const { data } = await api.get<Trim[]>('/vehicles/trims', {
    params: { modelId, ...(year ? { year } : {}) },
  });
  return data;
}

// ── Years ─────────────────────────────────────────────────────────
export async function fetchYears(
  modelId?: string | number,
): Promise<YearOption[]> {
  if (modelId) {
    try {
      const { data } = await api.get<string[]>('/vehicles/years', {
        params: { modelId },
      });
      return data.map((y) => ({ value: String(y), label: String(y) }));
    } catch {
      // fall through to default range
    }
  }
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1999 }, (_, i) => {
    const y = String(currentYear - i);
    return { value: y, label: y };
  });
}

// ── Locations ─────────────────────────────────────────────────────
export async function fetchLocations(): Promise<Location[]> {
  const { data } = await api.get<Location[]>('/locations');
  return data;
}

// ── Build URL search params from filters ──────────────────────────
export function buildSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.set(key, String(value));
      }
    },
  );
  return params;
}
