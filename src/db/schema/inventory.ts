/**
 * db/schema/inventory.ts
 * Vehicle arrivals — the primary stock-in event for the fruit commission ERP.
 */

import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

// ── Vehicle Arrivals ──────────────────────────────────────────────────────────
export const vehicleArrivals = sqliteTable('vehicle_arrivals', {
  id:                     text('id').primaryKey(),
  arrivalNo:              text('arrival_no').notNull(),
  date:                   text('date').notNull(),
  day:                    text('day').notNull().default(''),
  vehicleNo:              text('vehicle_no').notNull(),
  vehicleName:            text('vehicle_name'),
  fruitType:              text('fruit_type').notNull(),
  totalVehicleWeight:     real('total_vehicle_weight').notNull().default(0),
  driverName:             text('driver_name'),
  notes:                  text('notes'),
  rows:                   text('rows').notNull().default('[]'),          // JSON: PurchaseRow[]
  totalCarets:            real('total_carets').notNull().default(0),
  totalCalculatedWeight:  real('total_calculated_weight').notNull().default(0),
  totalAmount:            real('total_amount').notNull().default(0),
  freightCharge:          real('freight_charge'),
  hamaliCharge:           real('hamali_charge'),
  advancePaid:            real('advance_paid'),
  status:                 text('status').notNull().default('DRAFT'),     // 'DRAFT' | 'SAVED'
  createdAt:              text('created_at').notNull(),
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbVehicleArrival       = typeof vehicleArrivals.$inferSelect;
export type DbVehicleArrivalInsert = typeof vehicleArrivals.$inferInsert;
