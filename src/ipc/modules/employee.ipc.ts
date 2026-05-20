/**
 * ipc/modules/employee.ipc.ts
 * Frontend IPC module for employee CRUD commands.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *
 *   // List with filters
 *   const { items, total } = await ipc.employee.list({ role: 'staff', page: 1 });
 *
 *   // Get one
 *   const emp = await ipc.employee.get({ id: 'uuid-here' });
 *
 *   // Create
 *   const created = await ipc.employee.create({ name: 'Ravi', email: 'ravi@tfc.in' });
 *
 *   // Partial update
 *   const updated = await ipc.employee.update('uuid', { department: 'Sales' });
 *
 *   // Soft delete
 *   await ipc.employee.setActive({ id: 'uuid', active: false });
 *
 *   // Hard delete
 *   await ipc.employee.delete({ id: 'uuid' });
 *
 *   // Bulk insert (single transaction)
 *   const created = await ipc.employee.bulkInsert({ employees: [...] });
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  Employee,
  EmployeeFilter,
  EmployeeListResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  SetActiveRequest,
  BulkInsertRequest,
} from '../types';

export const employeeIpc = {
  /** List employees with optional filters and pagination. */
  list(filter: EmployeeFilter = {}): Promise<EmployeeListResponse> {
    return ipcInvoke<EmployeeListResponse>(
      CMD.employee.list,
      { payload: filter },
      // Browser fallback
      { items: [], total: 0, page: 1, limit: 20, total_pages: 0 },
    );
  },

  /** Fetch a single employee by ID. Throws NOT_FOUND if missing. */
  get(id: string): Promise<Employee> {
    return ipcInvoke<Employee>(CMD.employee.get, { payload: { id } });
  },

  /** Create a new employee. Throws VALIDATION_ERROR if email is taken. */
  create(input: CreateEmployeeRequest): Promise<Employee> {
    return ipcInvoke<Employee>(CMD.employee.create, { payload: input });
  },

  /**
   * Partially update an employee.
   * Only the fields you pass will be changed.
   */
  update(id: string, input: UpdateEmployeeRequest): Promise<Employee> {
    return ipcInvoke<Employee>(CMD.employee.update, { id, payload: input });
  },

  /** Hard-delete an employee. Throws NOT_FOUND if missing. */
  delete(id: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.employee.delete, { payload: { id } });
  },

  /** Soft-delete or restore an employee (toggle is_active). */
  setActive(request: SetActiveRequest): Promise<Employee> {
    return ipcInvoke<Employee>(CMD.employee.setActive, { payload: request });
  },

  /**
   * Bulk-insert employees inside a single transaction.
   * All succeed or all are rolled back.
   */
  bulkInsert(request: BulkInsertRequest): Promise<Employee[]> {
    return ipcInvoke<Employee[]>(CMD.employee.bulkInsert, { payload: request });
  },
};
