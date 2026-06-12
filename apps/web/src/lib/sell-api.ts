// apps/web/src/lib/sell-api.ts
// Typed API helpers for the "Sell a Car" feature.
// Uses the same axios instance (api) as the rest of the app so auth headers
// and token refresh are handled automatically.

import { api, invalidateListingsCache } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateListingPayload {
  titleEn: string;
  titleKu: string;
  titleAr: string;
  titleZh: string;
  price: number;
  currency: string;
  condition: string;
  type: string;
  descriptionEn?: string;
  descriptionKu?: string;
  descriptionAr?: string;
  negotiable?: boolean;
  images?: string[]; // CDN URLs returned by the upload endpoint
  locationId?: string;
  categoryId?: string;
}

export interface ListingCreatedResponse {
  id: string;
  titleEn: string;
  status: string;
  createdAt: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const sellApi = {
  /**
   * POST /listings
   * Creates a new listing. Requires a valid JWT (injected automatically by
   * the axios interceptor in api.ts).
   */
  createListing: async (payload: CreateListingPayload): Promise<ListingCreatedResponse> => {
    const res = await api.post<ListingCreatedResponse>('/listings', payload);
    // BUG FIX #4: Bust the frontend axios SWR cache immediately after a new listing
    // is created. Without this, cachedGet('/listings') serves stale data for up to
    // 60 seconds and the new listing is invisible in the marketplace feed.
    invalidateListingsCache();
    return res.data;
  },

  /**
   * POST /upload/image
   * Uploads the file as multipart/form-data and returns the public CDN URL
   * returned by the backend.
   *
   * ✅ FIX #1 (Critical): Do NOT manually set Content-Type to 'multipart/form-data'.
   * When you set it manually, axios removes its automatically generated boundary
   * parameter (e.g. boundary=----WebKitFormBoundaryXXXX), so the server receives
   * a body it cannot parse → multer gets undefined → 500 Internal Server Error.
   * Let axios detect FormData and set the full Content-Type header automatically.
   *
   * Falls back to a data-URL only when NEXT_PUBLIC_USE_MOCK_UPLOAD=true
   * (local dev without a running upload endpoint). Never use in production.
   */
  uploadImage: async (file: File): Promise<string> => {
    if (process.env.NEXT_PUBLIC_USE_MOCK_UPLOAD === 'true') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }

    const formData = new FormData();
    formData.append('file', file);

    // ✅ No custom headers object — axios sets Content-Type with boundary automatically
    const res = await api.post<{ url: string }>('/upload/image', formData);
    return res.data.url;
  },
};

export default sellApi;
