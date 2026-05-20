/**
 * db/repositories/index.ts
 * Single import point for all repositories.
 *
 *   import { SupplierRepository, CustomerRepository } from '@/db/repositories';
 */

export * from './base.repository';
export * from './supplier.repository';
export * from './customer.repository';
export * from './vehicle-arrival.repository';
export * from './invoice.repository';
export * from './payment.repository';
export * from './settings.repository';
