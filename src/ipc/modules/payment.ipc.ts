/**
 * ipc/modules/payment.ipc.ts
 * Frontend IPC calls for the payments domain.
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  Payment,
  CreatePaymentRequest,
  PaymentFilter,
  PaymentListResponse,
} from '../types';

export const paymentIpc = {
  list: (filter: PaymentFilter = {}) =>
    ipcInvoke<PaymentListResponse>(CMD.payment.list, filter, {
      items: [], total: 0, page: 1, limit: 20, total_pages: 1,
    }),

  get: (id: string) =>
    ipcInvoke<Payment>(CMD.payment.get, { id }),

  create: (payload: CreatePaymentRequest) =>
    ipcInvoke<Payment>(CMD.payment.create, payload),

  delete: (id: string) =>
    ipcInvoke<boolean>(CMD.payment.delete, { id }),

  /** Total amount paid by a party — for balance display. */
  totalByParty: (partyId: string) =>
    ipcInvoke<number>(CMD.payment.totalByParty, { party_id: partyId }, 0),
};
