// apps/web/src/lib/vehicleFilters.ts
// Dynamic filter data fetched from the API — no hardcoded options

import { api } from './api';

export interface Brand {
  id: number | string;
  name: string;       // e.g. "Toyota"
  nameKu?: string;    // e.g. "تۆیۆتا"
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
  value: string; // "2024"
  label: string; // "2024"
}

// ── Brands ───────────────────────────────────────────────────────
export async function fetchBrands(): Promise<Brand[]> {
  const { data } = await api.get<Brand[]>('/vehicles/brands');
  return data;
}

// ── Models (depends on brand) ─────────────────────────────────────
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
// The API may return available years; fallback generates client-side
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
  // Default: current year → 2000
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1999 }, (_, i) => {
    const y = String(currentYear - i);
    return { value: y, label: y };
  });
}
