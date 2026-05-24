// apps/web/src/hooks/useVehicleFilters.ts
// Cascading async filter hook: brand → model → year → trim
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVehicleFilters = useVehicleFilters;
const react_1 = require("react");
const vehicleFilters_1 = require("../lib/vehicleFilters");
function useVehicleFilters() {
    const [brands, setBrands] = (0, react_1.useState)([]);
    const [models, setModels] = (0, react_1.useState)([]);
    const [years, setYears] = (0, react_1.useState)([]);
    const [trims, setTrims] = (0, react_1.useState)([]);
    const [brandId, setBrandIdRaw] = (0, react_1.useState)('');
    const [modelId, setModelIdRaw] = (0, react_1.useState)('');
    const [year, setYearRaw] = (0, react_1.useState)('');
    const [trimId, setTrimIdRaw] = (0, react_1.useState)('');
    const [loadingBrands, setLoadingBrands] = (0, react_1.useState)(false);
    const [loadingModels, setLoadingModels] = (0, react_1.useState)(false);
    const [loadingYears, setLoadingYears] = (0, react_1.useState)(false);
    const [loadingTrims, setLoadingTrims] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // ── 1. Load brands on mount ───────────────────────────────────
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        setLoadingBrands(true);
        setError(null);
        (0, vehicleFilters_1.fetchBrands)()
            .then((data) => { if (!cancelled)
            setBrands(data); })
            .catch(() => { if (!cancelled)
            setError('Failed to load brands'); })
            .finally(() => { if (!cancelled)
            setLoadingBrands(false); });
        return () => { cancelled = true; };
    }, []);
    // ── 2. Load models when brand changes ─────────────────────────
    (0, react_1.useEffect)(() => {
        setModels([]);
        setModelIdRaw('');
        setYears([]);
        setYearRaw('');
        setTrims([]);
        setTrimIdRaw('');
        if (!brandId) {
            // Load default years when no brand selected
            (0, vehicleFilters_1.fetchYears)().then(setYears).catch(() => { });
            return;
        }
        let cancelled = false;
        setLoadingModels(true);
        (0, vehicleFilters_1.fetchModels)(brandId)
            .then((data) => { if (!cancelled)
            setModels(data); })
            .catch(() => { if (!cancelled)
            setError('Failed to load models'); })
            .finally(() => { if (!cancelled)
            setLoadingModels(false); });
        return () => { cancelled = true; };
    }, [brandId]);
    // ── 3. Load years when model changes ─────────────────────────
    (0, react_1.useEffect)(() => {
        setYears([]);
        setYearRaw('');
        setTrims([]);
        setTrimIdRaw('');
        if (!modelId)
            return;
        let cancelled = false;
        setLoadingYears(true);
        (0, vehicleFilters_1.fetchYears)(modelId)
            .then((data) => { if (!cancelled)
            setYears(data); })
            .catch(() => { if (!cancelled)
            (0, vehicleFilters_1.fetchYears)().then(setYears); }) // fallback
            .finally(() => { if (!cancelled)
            setLoadingYears(false); });
        return () => { cancelled = true; };
    }, [modelId]);
    // ── 4. Load trims when model + year known ─────────────────────
    (0, react_1.useEffect)(() => {
        setTrims([]);
        setTrimIdRaw('');
        if (!modelId)
            return;
        let cancelled = false;
        setLoadingTrims(true);
        (0, vehicleFilters_1.fetchTrims)(modelId, year || undefined)
            .then((data) => { if (!cancelled)
            setTrims(data); })
            .catch(() => { })
            .finally(() => { if (!cancelled)
            setLoadingTrims(false); });
        return () => { cancelled = true; };
    }, [modelId, year]);
    // ── Setters with cascade reset ────────────────────────────────
    const setBrandId = (0, react_1.useCallback)((id) => {
        setBrandIdRaw(id);
    }, []);
    const setModelId = (0, react_1.useCallback)((id) => {
        setModelIdRaw(id);
    }, []);
    const setYear = (0, react_1.useCallback)((y) => {
        setYearRaw(y);
        setTrimIdRaw('');
    }, []);
    const setTrimId = (0, react_1.useCallback)((id) => {
        setTrimIdRaw(id);
    }, []);
    const reset = (0, react_1.useCallback)(() => {
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
