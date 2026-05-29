use serde::{Deserialize, Serialize};
use rusqlite::Row;
use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Invoice {
    pub id: String,
    pub company_id: String,
    pub financial_year_id: String,
    pub invoice_type: String, // 'SALE', 'PURCHASE'
    pub invoice_number: String,
    pub date: i64,
    pub ledger_id: String,
    pub vehicle_no: Option<String>,
    pub declared_weight: Option<f64>,
    pub sub_total: f64,
    pub tax_total: f64,
    pub discount_total: f64,
    pub freight: f64,
    pub hamali: f64,
    pub other_charges: f64,
    pub round_off: f64,
    pub grand_total: f64,
    pub paid_amount: f64,
    pub notes: Option<String>,
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InvoiceItem {
    pub id: String,
    pub invoice_id: String,
    pub variety_id: String,
    pub quantity: f64,
    pub weight: Option<f64>,
    pub rate: f64,
    pub pricing_type: String,
    pub amount: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub row_note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoice {
    pub company_id: String,
    pub financial_year_id: String,
    pub invoice_number: String,
    pub date: i64,
    pub ledger_id: String,
    pub vehicle_no: Option<String>,
    pub declared_weight: Option<f64>,
    pub sub_total: f64,
    pub grand_total: f64,
    pub items: Vec<CreateInvoiceItem>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceItem {
    pub variety_id: String,
    pub quantity: f64,
    pub weight: Option<f64>,
    pub rate: f64,
    pub pricing_type: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceFilter {
    pub company_id: String,
    pub financial_year_id: String,
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub search: Option<String>,
}

pub type CreatePurchaseInvoice = CreateInvoice;
pub type PurchaseInvoice = Invoice;
pub type PurchaseInvoiceFilter = InvoiceFilter;

impl CreateInvoice {
    pub fn validate(&self) -> AppResult<()> {
        if self.items.is_empty() {
            return Err(crate::error::AppError::Validation("Invoice must have at least one item".to_string()));
        }
        Ok(())
    }
}

impl Invoice {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            financial_year_id: row.get("financial_year_id")?,
            invoice_type: row.get("type")?,
            invoice_number: row.get("invoice_number")?,
            date: row.get("date")?,
            ledger_id: row.get("ledger_id")?,
            vehicle_no: row.get("vehicle_no")?,
            declared_weight: row.get("declared_weight")?,
            sub_total: row.get("sub_total")?,
            tax_total: row.get("tax_total")?,
            discount_total: row.get("discount_total")?,
            freight: row.get("freight")?,
            hamali: row.get("hamali")?,
            other_charges: row.get("other_charges")?,
            round_off: row.get("round_off")?,
            grand_total: row.get("grand_total")?,
            paid_amount: row.get("paid_amount")?,
            notes: row.get("notes")?,
            status: row.get("status")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

impl InvoiceItem {
    #[allow(dead_code)]
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            invoice_id: row.get("invoice_id")?,
            variety_id: row.get("variety_id")?,
            quantity: row.get("quantity")?,
            weight: row.get("weight")?,
            rate: row.get("rate")?,
            pricing_type: row.get("pricing_type")?,
            amount: row.get("amount")?,
            tax_rate: row.get("tax_rate")?,
            tax_amount: row.get("tax_amount")?,
            row_note: row.get("row_note")?,
        })
    }
}
