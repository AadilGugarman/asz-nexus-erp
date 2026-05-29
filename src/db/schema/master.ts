import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies } from "./core";

/**
 * ACCOUNT GROUPS
 * e.g., "Sundry Debtors", "Sundry Creditors", "Direct Expenses"
 */
export const accountGroups = sqliteTable("account_groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  parentGroupId: text("parent_group_id"),
  nature: text("nature").notNull(), // Asset, Liability, Income, Expense
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});

/**
 * LEDGERS (Parties - Customers & Suppliers)
 */
export const ledgers = sqliteTable("ledgers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => accountGroups.id),

  name: text("name").notNull(),
  code: text("code"), // Supplier Code e.g., KFA-01
  type: text("type").notNull(), // 'CUSTOMER', 'SUPPLIER', 'BOTH'

  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),

  billingAddress: text("billing_address"),
  shippingAddress: text("shipping_address"),
  city: text("city"),
  state: text("state"),

  openingBalance: real("opening_balance").default(0),
  openingBalanceType: text("opening_balance_type").default("Dr"), // Dr or Cr
  creditLimit: real("credit_limit").default(0),

  notes: text("notes"),
  isSystem: integer("is_system", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});

export type DbLedger = typeof ledgers.$inferSelect;
export type DbLedgerInsert = typeof ledgers.$inferInsert;

/**
 * FRUITS (Categories)
 * e.g., "Mango", "Apple"
 */
export const fruits = sqliteTable("fruits", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  varieties: text("varieties"), // JSON array string (legacy support)
  pricingType: text("pricing_type").default("caret"), // 'kg' or 'caret'
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});

/**
 * VARIETIES (Actual Items/Vakkals)
 * e.g., "Organic Kesar Jumbo", "Kesar Medium"
 */
export const varieties = sqliteTable("varieties", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  fruitId: text("fruit_id")
    .notNull()
    .references(() => fruits.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});
