import { relations } from "drizzle-orm";
import * as schema from "./schema";

export const companiesRelations = relations(schema.companies, ({ many }) => ({
  financialYears: many(schema.financialYears),
  ledgers: many(schema.ledgers),
  fruits: many(schema.fruits),
  invoices: many(schema.invoices),
  payments: many(schema.payments),
  caretTransactions: many(schema.caretTransactions),
}));

export const financialYearsRelations = relations(
  schema.financialYears,
  ({ one, many }) => ({
    company: one(schema.companies, {
      fields: [schema.financialYears.companyId],
      references: [schema.companies.id],
    }),
    invoices: many(schema.invoices),
    payments: many(schema.payments),
    caretTransactions: many(schema.caretTransactions),
  }),
);

export const accountGroupsRelations = relations(
  schema.accountGroups,
  ({ one, many }) => ({
    company: one(schema.companies, {
      fields: [schema.accountGroups.companyId],
      references: [schema.companies.id],
    }),
    parentGroup: one(schema.accountGroups, {
      fields: [schema.accountGroups.parentGroupId],
      references: [schema.accountGroups.id],
      relationName: "groupHierarchy",
    }),
    subGroups: many(schema.accountGroups, {
      relationName: "groupHierarchy",
    }),
    ledgers: many(schema.ledgers),
  }),
);

export const ledgersRelations = relations(schema.ledgers, ({ one, many }) => ({
  company: one(schema.companies, {
    fields: [schema.ledgers.companyId],
    references: [schema.companies.id],
  }),
  group: one(schema.accountGroups, {
    fields: [schema.ledgers.groupId],
    references: [schema.accountGroups.id],
  }),
  invoices: many(schema.invoices),
  payments: many(schema.payments, { relationName: "ledgerPayments" }),
  offsetPayments: many(schema.payments, {
    relationName: "offsetLedgerPayments",
  }),
  caretTransactions: many(schema.caretTransactions),
}));

export const fruitsRelations = relations(schema.fruits, ({ one, many }) => ({
  company: one(schema.companies, {
    fields: [schema.fruits.companyId],
    references: [schema.companies.id],
  }),
  varieties: many(schema.varieties),
}));

export const varietiesRelations = relations(
  schema.varieties,
  ({ one, many }) => ({
    company: one(schema.companies, {
      fields: [schema.varieties.companyId],
      references: [schema.companies.id],
    }),
    fruit: one(schema.fruits, {
      fields: [schema.varieties.fruitId],
      references: [schema.fruits.id],
    }),
    invoiceItems: many(schema.invoiceItems),
  }),
);

export const invoicesRelations = relations(
  schema.invoices,
  ({ one, many }) => ({
    company: one(schema.companies, {
      fields: [schema.invoices.companyId],
      references: [schema.companies.id],
    }),
    financialYear: one(schema.financialYears, {
      fields: [schema.invoices.financialYearId],
      references: [schema.financialYears.id],
    }),
    ledger: one(schema.ledgers, {
      fields: [schema.invoices.ledgerId],
      references: [schema.ledgers.id],
    }),
    items: many(schema.invoiceItems),
    caretTransactions: many(schema.caretTransactions),
  }),
);

export const invoiceItemsRelations = relations(
  schema.invoiceItems,
  ({ one }) => ({
    invoice: one(schema.invoices, {
      fields: [schema.invoiceItems.invoiceId],
      references: [schema.invoices.id],
    }),
    variety: one(schema.varieties, {
      fields: [schema.invoiceItems.varietyId],
      references: [schema.varieties.id],
    }),
  }),
);

export const paymentsRelations = relations(schema.payments, ({ one }) => ({
  company: one(schema.companies, {
    fields: [schema.payments.companyId],
    references: [schema.companies.id],
  }),
  financialYear: one(schema.financialYears, {
    fields: [schema.payments.financialYearId],
    references: [schema.financialYears.id],
  }),
  ledger: one(schema.ledgers, {
    fields: [schema.payments.ledgerId],
    references: [schema.ledgers.id],
    relationName: "ledgerPayments",
  }),
  offsetLedger: one(schema.ledgers, {
    fields: [schema.payments.offsetLedgerId],
    references: [schema.ledgers.id],
    relationName: "offsetLedgerPayments",
  }),
}));

export const caretTransactionsRelations = relations(
  schema.caretTransactions,
  ({ one }) => ({
    company: one(schema.companies, {
      fields: [schema.caretTransactions.companyId],
      references: [schema.companies.id],
    }),
    financialYear: one(schema.financialYears, {
      fields: [schema.caretTransactions.financialYearId],
      references: [schema.financialYears.id],
    }),
    ledger: one(schema.ledgers, {
      fields: [schema.caretTransactions.ledgerId],
      references: [schema.ledgers.id],
    }),
    invoice: one(schema.invoices, {
      fields: [schema.caretTransactions.invoiceId],
      references: [schema.invoices.id],
    }),
  }),
);
