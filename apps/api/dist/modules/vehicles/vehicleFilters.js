"use strict";
// apps/web/src/lib/vehicleFilters.ts
// Dynamic filter data fetched from the API — no hardcoded options
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBrands = fetchBrands;
exports.fetchModels = fetchModels;
exports.fetchTrims = fetchTrims;
exports.fetchYears = fetchYears;
const api_1 = require("./api");
// ── Brands ───────────────────────────────────────────────────────
async function fetchBrands() {
    const { data } = await api_1.api.get('/vehicles/brands');
    return data;
}
// ── Models (depends on brand) ─────────────────────────────────────
async function fetchModels(brandId) {
    const { data } = await api_1.api.get('/vehicles/models', {
        params: { brandId },
    });
    return data;
}
// ── Trims (depends on model + optional year) ─────────────────────
async function fetchTrims(modelId, year) {
    const { data } = await api_1.api.get('/vehicles/trims', {
        params: { modelId, ...(year ? { year } : {}) },
    });
    return data;
}
// ── Years ─────────────────────────────────────────────────────────
// The API may return available years; fallback generates client-side
async function fetchYears(modelId) {
    if (modelId) {
        try {
            const { data } = await api_1.api.get('/vehicles/years', {
                params: { modelId },
            });
            return data.map((y) => ({ value: String(y), label: String(y) }));
        }
        catch {
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
