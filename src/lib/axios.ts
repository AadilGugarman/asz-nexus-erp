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
    // Attach auth token if present (extend when you add auth)
    const token = localStorage.getItem('auth_token');
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
      // Handle unauthorised — clear token, redirect if needed
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  },
);
