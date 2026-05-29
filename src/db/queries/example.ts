import { getDb } from "../client";
import { invoices, invoiceItems, companies, financialYears } from "../schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * EXAMPLE: Fetching Invoices for a specific Company and Financial Year
 * This demonstrates the multi-tenant (company_id) and FY filtering.
 */
export async function getInvoicesForCompany(companyId: string, fyId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.query.invoices.findMany({
    where: and(
      eq(invoices.companyId, companyId),
      eq(invoices.financialYearId, fyId),
    ),
    with: {
      ledger: true, // Includes Customer/Supplier details
      items: {
        with: {
          item: true, // Includes Product details
        },
      },
    },
    orderBy: [desc(invoices.date)],
  });
}

/**
 * EXAMPLE: Creating a new Invoice with Items (Transaction-like)
 */
export async function createInvoice(data: any) {
  const db = await getDb();
  if (!db) return;

  // In Drizzle SQLite proxy (Tauri), we usually do multiple calls
  // or use the backend repository for complex transactions.
  // Here is the Drizzle way:

  const [newInvoice] = await db
    .insert(invoices)
    .values({
      companyId: data.companyId,
      financialYearId: data.financialYearId,
      type: "SALE",
      invoiceNumber: data.invoiceNumber,
      date: new Date(),
      ledgerId: data.ledgerId,
      subTotal: data.subTotal,
      grandTotal: data.grandTotal,
      status: "FINAL",
    })
    .returning();

  if (data.items && data.items.length > 0) {
    await db.insert(invoiceItems).values(
      data.items.map((item: any) => ({
        invoiceId: newInvoice.id,
        itemId: item.id,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })),
    );
  }

  return newInvoice;
}

/**
 * EXAMPLE: Get Company Dashboard Data
 */
export async function getCompanyDashboard(companyId: string, fyId: string) {
  const db = await getDb();
  if (!db) return null;

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    with: {
      financialYears: {
        where: eq(financialYears.id, fyId),
      },
    },
  });

  return company;
}
