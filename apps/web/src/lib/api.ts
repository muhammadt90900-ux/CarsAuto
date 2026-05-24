// apps/web/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage automatically on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error shape so catch blocks always see err.message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const serverMsg = err?.response?.data?.message;
    if (serverMsg) {
      err.message = Array.isArray(serverMsg) ? serverMsg.join(' · ') : serverMsg;
    }
    return Promise.reject(err);
  },
);
