// apps/web/src/hooks/useVehicleFilters.ts
// Cascading async filter hook: brand → model → year → trim

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchBrands,
  fetchModels,
  fetchTrims,
  fetchYears,
  Brand,
  VehicleModel,
  Trim,
  YearOption,
} from '../lib/vehicleFilters';

export interface VehicleFilterState {
  // Selected values
  brandId: string;
  modelId: string;
  year: string;
  trimId: string;

  // Available options (API-driven)
  brands: Brand[];
  models: VehicleModel[];
  years: YearOption[];
  trims: Trim[];

  // Loading states per selector
  loadingBrands: boolean;
  loadingModels: boolean;
  loadingYears: boolean;
  loadingTrims: boolean;

  // Error state
  error: string | null;

  // Setters
  setBrandId: (id: string) => void;
  setModelId: (id: string) => void;
  setYear: (year: string) => void;
  setTrimId: (id: string) => void;

  // Reset all
  reset: () => void;
}

export function useVehicleFilters(): VehicleFilterState {
  const [brands, setBrands]         = useState<Brand[]>([]);
  const [models, setModels]         = useState<VehicleModel[]>([]);
  const [years, setYears]           = useState<YearOption[]>([]);
  const [trims, setTrims]           = useState<Trim[]>([]);

  const [brandId, setBrandIdRaw]    = useState('');
  const [modelId, setModelIdRaw]    = useState('');
  const [year, setYearRaw]          = useState('');
  const [trimId, setTrimIdRaw]      = useState('');

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears]   = useState(false);
  const [loadingTrims, setLoadingTrims]   = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // ── 1. Load brands on mount ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingBrands(true);
    setError(null);
    fetchBrands()
      .then((data) => { if (!cancelled) setBrands(data); })
      .catch(() => { if (!cancelled) setError('Failed to load brands'); })
      .finally(() => { if (!cancelled) setLoadingBrands(false); });
    return () => { cancelled = true; };
  }, []);

  // ── 2. Load models when brand changes ─────────────────────────
  useEffect(() => {
    setModels([]);
    setModelIdRaw('');
    setYears([]);
    setYearRaw('');
    setTrims([]);
    setTrimIdRaw('');

    if (!brandId) {
      // Load default years when no brand selected
      fetchYears().then(setYears).catch(() => {});
      return;
    }

    let cancelled = false;
    setLoadingModels(true);
    fetchModels(brandId)
      .then((data) => { if (!cancelled) setModels(data); })
      .catch(() => { if (!cancelled) setError('Failed to load models'); })
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [brandId]);

  // ── 3. Load years when model changes ─────────────────────────
  useEffect(() => {
    setYears([]);
    setYearRaw('');
    setTrims([]);
    setTrimIdRaw('');

    if (!modelId) return;

    let cancelled = false;
    setLoadingYears(true);
    fetchYears(modelId)
      .then((data) => { if (!cancelled) setYears(data); })
      .catch(() => { if (!cancelled) fetchYears().then(setYears); }) // fallback
      .finally(() => { if (!cancelled) setLoadingYears(false); });
    return () => { cancelled = true; };
  }, [modelId]);

  // ── 4. Load trims when model + year known ─────────────────────
  useEffect(() => {
    setTrims([]);
    setTrimIdRaw('');

    if (!modelId) return;

    let cancelled = false;
    setLoadingTrims(true);
    fetchTrims(modelId, year || undefined)
      .then((data) => { if (!cancelled) setTrims(data); })
      .catch(() => { /* trims optional — silence */ })
      .finally(() => { if (!cancelled) setLoadingTrims(false); });
    return () => { cancelled = true; };
  }, [modelId, year]);

  // ── Setters with cascade reset ────────────────────────────────
  const setBrandId = useCallback((id: string) => {
    setBrandIdRaw(id);
  }, []);

  const setModelId = useCallback((id: string) => {
    setModelIdRaw(id);
  }, []);

  const setYear = useCallback((y: string) => {
    setYearRaw(y);
    setTrimIdRaw('');
  }, []);

  const setTrimId = useCallback((id: string) => {
    setTrimIdRaw(id);
  }, []);

  const reset = useCallback(() => {
    setBrandIdRaw('');
    setModelIdRaw('');
    setYearRaw('');
    setTrimIdRaw('');
    setModels([]);
    setTrims([]);
  }, []);

  return {
    brandId, modelId, year, trimId,
    brands, models, years, trims,
    loadingBrands, loadingModels, loadingYears, loadingTrims,
    error,
    setBrandId, setModelId, setYear, setTrimId,
    reset,
  };
}
