/**
 * lib/axios.ts
 * Configured Axios instance with request/response interceptors.
 *
 * Usage:
 *   import { apiClient } from '@/lib/axios';
 *   const data = await apiClient.get('/endpoint');
 */

import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { APP_CONFIG } from '@/config';
import { useAuthStore } from '@/store';

export const apiClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: APP_CONFIG.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Prefer centralized auth store token; keep legacy localStorage fallback.
    const token = useAuthStore.getState().accessToken ?? localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Keep legacy behavior and clear centralized session state.
      localStorage.removeItem('auth_token');
      useAuthStore.getState().invalidateSession();
    }
    return Promise.reject(error);
  },
);
