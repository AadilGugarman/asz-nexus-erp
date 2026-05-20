/**
 * db/repositories/vehicle-arrival.repository.ts
 * Drizzle queries for vehicle_arrivals.
 * JSON columns (rows) are serialised/deserialised transparently.
 */

import { eq, like, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { vehicleArrivals } from '../schema/inventory';
import type { DbVehicleArrival, DbVehicleArrivalInsert } from '../schema/inventory';
import type { DrizzleDb } from '../client';
import type { PaginationParams, PagedResult } from './base.repository';
import type { PurchaseRow } from '@/types';

export interface VehicleArrivalFilter extends PaginationParams {
  dateFrom?:  string; // ISO date string
  dateTo?:    string;
  fruitType?: string;
  status?:    'DRAFT' | 'SAVED';
  vehicleNo?: string;
}

export class VehicleArrivalRepository extends BaseRepository<
  typeof vehicleArrivals,
  DbVehicleArrival,
  DbVehicleArrivalInsert
> {
  constructor(db: DrizzleDb) {
    super(db, vehicleArrivals);
  }

  // ── Filtered list ──────────────────────────────────────────────────────────

  async search(filter: VehicleArrivalFilter): Promise<PagedResult<DbVehicleArrival>> {
    // Build conditions array — Drizzle's and() requires at least 2 args,
    // so we collect and combine manually.
    const conditions = [];

    if (filter.dateFrom) conditions.push(eq(vehicleArrivals.date, filter.dateFrom));
    if (filter.fruitType) conditions.push(eq(vehicleArrivals.fruitType, filter.fruitType));
    if (filter.status)    conditions.push(eq(vehicleArrivals.status, filter.status));
    if (filter.vehicleNo) {
      conditions.push(like(vehicleArrivals.vehicleNo, `%${filter.vehicleNo}%`));
    }

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : conditions.reduce((a, b) => a && b);

    return this.findPaged(filter, where, desc(vehicleArrivals.date));
  }

  // ── Status transition ──────────────────────────────────────────────────────

  async markSaved(id: string): Promise<DbVehicleArrival> {
    return this.update(id, { status: 'SAVED' });
  }

  // ── JSON helpers ───────────────────────────────────────────────────────────

  /** Parse the JSON rows column into typed PurchaseRow[]. */
  parseRows(arrival: DbVehicleArrival): PurchaseRow[] {
    try {
      return JSON.parse(arrival.rows) as PurchaseRow[];
    } catch {
      return [];
    }
  }

  /** Serialise PurchaseRow[] for storage. */
  serializeRows(rows: PurchaseRow[]): string {
    return JSON.stringify(rows);
  }

  // ── Next arrival number ────────────────────────────────────────────────────

  async getLastArrivalNo(): Promise<string | null> {
    const rows = await this.db
      .select({ arrivalNo: vehicleArrivals.arrivalNo })
      .from(vehicleArrivals)
      .orderBy(desc(vehicleArrivals.createdAt))
      .limit(1);
    return rows[0]?.arrivalNo ?? null;
  }
}
