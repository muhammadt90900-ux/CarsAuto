// apps/web/src/lib/sell-api.ts
// Typed API helpers for the "Sell a Car" feature.
// Uses the same axios instance (api) as the rest of the app so auth headers
// and token refresh are handled automatically.

import { api } from '@/lib/api';

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
  images?: string[]; // URLs (data-URLs or CDN URLs)
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
    return res.data;
  },

  /**
   * POST /upload/image
   * Uploads the file as multipart/form-data and returns the public CDN URL
   * returned by the backend. This avoids sending large data-URLs in the
   * listing payload (which would cause 413 errors and overflow DB fields).
   *
   * Falls back to a data-URL only when the environment variable
   * NEXT_PUBLIC_USE_MOCK_UPLOAD=true is set (e.g. local dev without storage).
   */
  uploadImage: async (file: File): Promise<string> => {
    if (process.env.NEXT_PUBLIC_USE_MOCK_UPLOAD === 'true') {
      // Dev-only mock: returns a data-URL so you can test the form locally
      // without a running upload endpoint. Never use in production.
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }

    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ url: string }>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  },
};

export default sellApi;
