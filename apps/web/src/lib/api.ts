import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

// Listings API
export const listingsApi = {
  getAll: async (params?: any) => {
    const res = await api.get('/listings', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get(`/listings/${id}`);
    return res.data;
  },
};

// Vehicles API
export const vehiclesApi = {
  getBrands: async () => {
    const res = await api.get('/vehicles/brands');
    return res.data;
  },

  getModels: async (brandId: string) => {
    const res = await api.get(`/vehicles/brands/${brandId}/models`);
    return res.data;
  },

  getYears: async (modelId: string) => {
    const res = await api.get(`/vehicles/models/${modelId}/years`);
    return res.data;
  },

  getTrims: async (modelId: string, year: string) => {
    const res = await api.get(
     `/vehicles/models/${modelId}/trims?year=${year}`
    );

    return res.data;
  },
};