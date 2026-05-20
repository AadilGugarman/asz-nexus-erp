/**
 * services/base.service.ts
 * Generic CRUD service built on top of the configured axios instance.
 *
 * Extend this for any resource:
 *   class SupplierService extends BaseService<Supplier> {
 *     constructor() { super('/suppliers'); }
 *   }
 */

import { apiClient } from '@/lib/axios';
import type { AxiosRequestConfig } from 'axios';

export class BaseService<T> {
  constructor(protected readonly basePath: string) {}

  async getAll(config?: AxiosRequestConfig): Promise<T[]> {
    const res = await apiClient.get<T[]>(this.basePath, config);
    return res.data;
  }

  async getById(id: string | number, config?: AxiosRequestConfig): Promise<T> {
    const res = await apiClient.get<T>(`${this.basePath}/${id}`, config);
    return res.data;
  }

  async create(payload: Partial<T>, config?: AxiosRequestConfig): Promise<T> {
    const res = await apiClient.post<T>(this.basePath, payload, config);
    return res.data;
  }

  async update(
    id: string | number,
    payload: Partial<T>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res = await apiClient.put<T>(`${this.basePath}/${id}`, payload, config);
    return res.data;
  }

  async patch(
    id: string | number,
    payload: Partial<T>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res = await apiClient.patch<T>(`${this.basePath}/${id}`, payload, config);
    return res.data;
  }

  async remove(id: string | number, config?: AxiosRequestConfig): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`, config);
  }
}
