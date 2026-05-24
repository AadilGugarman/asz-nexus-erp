/**
 * db/services/db.service.ts
 * Singleton service that owns all repository instances.
 *
 * Components and hooks import from here — never instantiate repositories directly.
 *
 * Usage:
 *   import { dbService } from '@/db/services';
 *
 *   const suppliers = await dbService.suppliers.findAll();
 *   const invoice   = await dbService.invoices.findById('abc');
 *
 * The service lazily initialises on first use. If the DB is unavailable
 * (browser dev mode), all methods return null/empty gracefully.
 */

import { getDb } from "../client";
import { FruitRepository } from "../repositories/fruit.repository";
import { SupplierRepository } from "../repositories/supplier.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { VehicleArrivalRepository } from "../repositories/vehicle-arrival.repository";
import {
  InvoiceRepository,
  PurchaseInvoiceRepository,
} from "../repositories/invoice.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { SettingsRepository } from "../repositories/settings.repository";

class DbService {
  private _fruits?: FruitRepository;
  private _suppliers?: SupplierRepository;
  private _customers?: CustomerRepository;
  private _vehicleArrivals?: VehicleArrivalRepository;
  private _invoices?: InvoiceRepository;
  private _purchaseInvoices?: PurchaseInvoiceRepository;
  private _payments?: PaymentRepository;
  private _settings?: SettingsRepository;

  /** Ensure all repositories are initialised. Call once at app startup. */
  async init(): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    this._fruits = new FruitRepository(db);
    this._suppliers = new SupplierRepository(db);
    this._customers = new CustomerRepository(db);
    this._vehicleArrivals = new VehicleArrivalRepository(db);
    this._invoices = new InvoiceRepository(db);
    this._purchaseInvoices = new PurchaseInvoiceRepository(db);
    this._payments = new PaymentRepository(db);
    this._settings = new SettingsRepository(db);

    return true;
  }

  get fruits(): FruitRepository {
    return this._require(this._fruits, "fruits");
  }
  get suppliers(): SupplierRepository {
    return this._require(this._suppliers, "suppliers");
  }
  get customers(): CustomerRepository {
    return this._require(this._customers, "customers");
  }
  get vehicleArrivals(): VehicleArrivalRepository {
    return this._require(this._vehicleArrivals, "vehicleArrivals");
  }
  get invoices(): InvoiceRepository {
    return this._require(this._invoices, "invoices");
  }
  get purchaseInvoices(): PurchaseInvoiceRepository {
    return this._require(this._purchaseInvoices, "purchaseInvoices");
  }
  get payments(): PaymentRepository {
    return this._require(this._payments, "payments");
  }
  get settings(): SettingsRepository {
    return this._require(this._settings, "settings");
  }

  get isReady(): boolean {
    return !!this._suppliers;
  }

  private _require<T>(repo: T | undefined, name: string): T {
    if (!repo) {
      console.warn(
        `[DbService] Repository '${name}' accessed before init — returning no-op proxy.`,
      );
      // Return a safe proxy so callers never crash regardless of environment.
      // All methods return empty/null gracefully.
      return new Proxy({} as T, {
        get: (_target, prop) => {
          if (typeof prop === "string") {
            return async (..._args: unknown[]) => {
              console.warn(`[DbService] ${name}.${prop}() called before init — no-op.`);
              return prop === "findAll" || prop === "findPaged" ? [] : null;
            };
          }
          return undefined;
        },
      });
    }
    return repo;
  }
}

/** Singleton — import this everywhere. */
export const dbService = new DbService();
