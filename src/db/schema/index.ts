/**
 * db/schema/index.ts
 * Re-exports every domain schema so consumers can import from one place.
 *
 *   import { suppliers, customers, invoices } from '@/db/schema';
 */

export * from './master';
export * from './parties';
export * from './billing';
export * from './payments';
export * from './settings';
export * from './carets';
