/**
 * ipc/modules/supplier.ipc.ts
 * Frontend IPC calls for the supplier domain.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *   const result = await ipc.supplier.list({ search: 'Ahmed', page: 1 });
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierFilter,
  SupplierListResponse,
} from '../types';

export const supplierIpc = {
  list: (filter: SupplierFilter = {}) =>
    ipcInvoke<SupplierListResponse>(CMD.supplier.list, filter, {
      items: [], total: 0, page: 1, limit: 50, total_pages: 1,
    }),

  get: (id: string) =>
    ipcInvoke<Supplier>(CMD.supplier.get, { id }),

  create: (payload: CreateSupplierRequest) =>
    ipcInvoke<Supplier>(CMD.supplier.create, payload),

  update: (id: string, payload: UpdateSupplierRequest) =>
    ipcInvoke<Supplier>(CMD.supplier.update, { id, ...payload }),

  delete: (id: string) =>
    ipcInvoke<boolean>(CMD.supplier.delete, { id }),
};
