/**
 * ipc/modules/invoice.ipc.ts
 * Frontend IPC calls for sales invoices and purchase invoices.
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  Invoice,
  CreateInvoiceRequest,
  InvoiceFilter,
  InvoiceListResponse,
  PurchaseInvoice,
  CreatePurchaseInvoiceRequest,
  PurchaseInvoiceFilter,
  PurchaseInvoiceListResponse,
} from '../types';

const EMPTY_LIST = { items: [], total: 0, page: 1, limit: 20, total_pages: 1 };

export const invoiceIpc = {
  // ── Sales invoices ──────────────────────────────────────────────────────────
  list: (filter: InvoiceFilter = {}) =>
    ipcInvoke<InvoiceListResponse>(CMD.invoice.list, filter, EMPTY_LIST),

  get: (id: string) =>
    ipcInvoke<Invoice>(CMD.invoice.get, { id }),

  create: (payload: CreateInvoiceRequest) =>
    ipcInvoke<Invoice>(CMD.invoice.create, payload),

  delete: (id: string) =>
    ipcInvoke<boolean>(CMD.invoice.delete, { id }),

  // ── Purchase invoices ───────────────────────────────────────────────────────
  purchaseList: (filter: PurchaseInvoiceFilter = {}) =>
    ipcInvoke<PurchaseInvoiceListResponse>(CMD.invoice.purchaseList, filter, EMPTY_LIST),

  purchaseGet: (id: string) =>
    ipcInvoke<PurchaseInvoice>(CMD.invoice.purchaseGet, { id }),

  purchaseCreate: (payload: CreatePurchaseInvoiceRequest) =>
    ipcInvoke<PurchaseInvoice>(CMD.invoice.purchaseCreate, payload),

  purchaseDelete: (id: string) =>
    ipcInvoke<boolean>(CMD.invoice.purchaseDelete, { id }),
};
