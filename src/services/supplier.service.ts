/**
 * services/supplier.service.ts
 * Example concrete service — extend BaseService for real API calls.
 * When the backend is ready, swap the mock implementations below.
 */

import { BaseService } from './base.service';
import type { Supplier } from '@/types';

class SupplierService extends BaseService<Supplier> {
  constructor() {
    super('/suppliers');
  }

  /** Example: fetch suppliers filtered by city */
  async getByCity(city: string): Promise<Supplier[]> {
    const all = await this.getAll({ params: { city } });
    return all;
  }
}

// Export a singleton — import { supplierService } from '@/services'
export const supplierService = new SupplierService();
