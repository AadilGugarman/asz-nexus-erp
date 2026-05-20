/**
 * ipc/modules/customer.ipc.ts
 * Frontend IPC calls for the customer domain.
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerFilter,
  CustomerListResponse,
} from '../types';

export const customerIpc = {
  list: (filter: CustomerFilter = {}) =>
    ipcInvoke<CustomerListResponse>(CMD.customer.list, filter, {
      items: [], total: 0, page: 1, limit: 50, total_pages: 1,
    }),

  get: (id: string) =>
    ipcInvoke<Customer>(CMD.customer.get, { id }),

  create: (payload: CreateCustomerRequest) =>
    ipcInvoke<Customer>(CMD.customer.create, payload),

  update: (id: string, payload: UpdateCustomerRequest) =>
    ipcInvoke<Customer>(CMD.customer.update, { id, ...payload }),

  delete: (id: string) =>
    ipcInvoke<boolean>(CMD.customer.delete, { id }),
};
