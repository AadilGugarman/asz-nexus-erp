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
import { InvoiceRepository } from "../repositories/invoice.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { CaretRepository } from "../repositories/caret.repository";
import { CompanyRepository } from "../repositories/company.repository";
import { AccountGroupRepository } from "../repositories/accountGroup.repository";
import { FinancialYearRepository } from "../repositories/financialYear.repository";

// ── Lightweight KV store backed by localStorage ───────────────────────────────
// Used by settings.store.ts to persist app config (settings, companies, activeFY).
// A proper SQLite-backed KV table can replace this in a future migration.
class KvStore {
  private prefix: string;
  constructor(prefix = "tfc_erp_kv_") {
    this.prefix = prefix;
  }
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }
  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignore */
    }
  }
}

const _kvStore = new KvStore();

class DbService {
  private _fruits?: FruitRepository;
  private _suppliers?: SupplierRepository;
  private _customers?: CustomerRepository;
  private _invoices?: InvoiceRepository;
  private _purchaseInvoices?: InvoiceRepository;
  private _payments?: PaymentRepository;
  private _caretTransactions?: CaretRepository;
  private _companies?: CompanyRepository;
  private _accountGroups?: AccountGroupRepository;
  private _financialYears?: FinancialYearRepository;

  /** In-flight init promise — prevents concurrent re-initialisation. */
  private _initPromise: Promise<boolean> | null = null;

  /** Ensure all repositories are initialised. Safe to call multiple times concurrently. */
  async init(): Promise<boolean> {
    // Already ready — fast path, no IPC needed
    if (this._suppliers) return true;

    // Concurrent callers await the same promise instead of racing
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const db = await getDb();
      if (!db) {
        this._initPromise = null;
        return false;
      }

      this._fruits = new FruitRepository(db);
      this._suppliers = new SupplierRepository(db);
      this._customers = new CustomerRepository(db);
      this._invoices = new InvoiceRepository(db);
      this._purchaseInvoices = new InvoiceRepository(db);
      this._payments = new PaymentRepository(db);
      this._caretTransactions = new CaretRepository(db);
      this._companies = new CompanyRepository(db);
      this._accountGroups = new AccountGroupRepository(db);
      this._financialYears = new FinancialYearRepository(db);

      return true;
    })();

    return this._initPromise;
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
  get invoices(): InvoiceRepository {
    return this._require(this._invoices, "invoices");
  }
  /** Alias for invoices — purchase invoices use the same repository with type filter. */
  get purchaseInvoices(): InvoiceRepository {
    return this._require(this._purchaseInvoices, "purchaseInvoices");
  }
  get payments(): PaymentRepository {
    return this._require(this._payments, "payments");
  }
  get caretTransactions(): CaretRepository {
    return this._require(this._caretTransactions, "caretTransactions");
  }
  get companies(): CompanyRepository {
    return this._require(this._companies, "companies");
  }
  get accountGroups(): AccountGroupRepository {
    return this._require(this._accountGroups, "accountGroups");
  }
  get financialYears(): FinancialYearRepository {
    return this._require(this._financialYears, "financialYears");
  }

  get isReady(): boolean {
    return !!this._suppliers;
  }

  /** Key-value config store — persists app settings, companies, activeFY. */
  get settings(): KvStore {
    return _kvStore;
  }

  private _require<T extends object>(repo: T | undefined, name: string): T {
    if (!repo) {
      console.warn(
        `[DbService] Repository '${name}' accessed before init — returning no-op proxy.`,
      );
      // Return a safe proxy so callers never crash regardless of environment.
      // All methods return empty/null gracefully.
      return new Proxy({} as T, {
        get: (target, prop) => {
          if (
            typeof prop === "string" &&
            (prop.startsWith("find") ||
              prop.startsWith("get") ||
              prop === "search")
          ) {
            return async () =>
              prop === "search" || prop === "findPaged"
                ? { items: [], total: 0, page: 1, limit: 20, totalPages: 1 }
                : null;
          }
          return () => {};
        },
      });
    }
    return repo;
  }
}

export const dbService = new DbService();
