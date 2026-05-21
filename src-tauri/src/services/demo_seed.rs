// services/demo_seed.rs
// Transactional ERP demo data generator for SQLite.

use std::collections::BTreeMap;

use chrono::{Datelike, Duration, NaiveDate, Utc};
use rusqlite::{params, Connection, Transaction};
use serde::Serialize;
use serde_json::json;

use crate::error::{AppError, AppResult};

const SETTINGS_KEY_APP: &str = "app_settings";
const SETTINGS_KEY_COMPANIES: &str = "companies";
const SETTINGS_KEY_ACTIVE_COMPANY: &str = "active_company_id";
const SETTINGS_KEY_SEED_META: &str = "demo_seed_metadata";

#[derive(Debug, Clone, Serialize)]
pub struct SeedTableCounts {
    pub fruits: u32,
    pub suppliers: u32,
    pub customers: u32,
    pub vehicle_arrivals: u32,
    pub purchase_invoices: u32,
    pub sales_invoices: u32,
    pub payments: u32,
    pub app_settings: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeedProfileRecommendation {
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub recommended_for: String,
    pub approx_history_days: u32,
    pub counts: SeedTableCounts,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeedPlanResponse {
    pub recommended_default: String,
    pub profiles: Vec<SeedProfileRecommendation>,
    pub scaling_strategy: String,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeedResetResponse {
    pub deleted_counts: SeedTableCounts,
    pub reset_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeedExecutionResponse {
    pub profile: String,
    pub reset_performed: bool,
    pub deleted_counts: SeedTableCounts,
    pub inserted_counts: SeedTableCounts,
    pub started_on: String,
    pub ended_on: String,
    pub seeded_at: String,
    pub company_name: String,
    pub settings_keys: Vec<String>,
}

#[derive(Debug, Clone, Copy)]
struct SeedProfileSpec {
    key: &'static str,
    display_name: &'static str,
    description: &'static str,
    recommended_for: &'static str,
    approx_history_days: u32,
    fruits: u32,
    suppliers: u32,
    customers: u32,
    vehicle_arrivals: u32,
    purchase_invoices: u32,
    sales_invoices: u32,
    payments: u32,
    rng_seed: u64,
}

#[derive(Debug, Clone, Copy)]
struct FruitCatalogEntry {
    name: &'static str,
    varieties: &'static [&'static str],
    min_rate: f64,
    max_rate: f64,
    min_weight_per_caret: f64,
    max_weight_per_caret: f64,
}

#[derive(Debug, Clone)]
struct FruitSeed {
    id: String,
    name: String,
    varieties: Vec<String>,
    min_rate: f64,
    max_rate: f64,
    min_weight_per_caret: f64,
    max_weight_per_caret: f64,
}

#[derive(Debug, Clone)]
struct SupplierSeed {
    id: String,
    name: String,
    code: String,
    phone: String,
    city: String,
    previous_balance: f64,
}

#[derive(Debug, Clone)]
struct CustomerSeed {
    id: String,
    name: String,
    phone: String,
    city: String,
    previous_balance: f64,
}

#[derive(Debug, Clone)]
struct StockBucket {
    fruit: String,
    variety: String,
    available_weight: f64,
    available_carets: f64,
    last_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct VehicleRowJson {
    id: String,
    supplier_id: String,
    supplier_name: String,
    variety: String,
    caret: f64,
    weight: f64,
    rate: f64,
    amount: f64,
    note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PurchaseInvoiceItemJson {
    id: String,
    fruit: String,
    variety: String,
    caret: f64,
    weight: f64,
    rate: f64,
    amount: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SalesInvoiceItemJson {
    id: String,
    fruit: String,
    lot_variety: String,
    caret: f64,
    weight: f64,
    rate: f64,
    amount: f64,
}

const FRUIT_CATALOG: &[FruitCatalogEntry] = &[
    FruitCatalogEntry {
        name: "Mango",
        varieties: &["Kesar", "Alphonso", "Rajapuri", "Badami", "Langra"],
        min_rate: 42.0,
        max_rate: 170.0,
        min_weight_per_caret: 16.0,
        max_weight_per_caret: 22.0,
    },
    FruitCatalogEntry {
        name: "Apple",
        varieties: &["Shimla", "Washington", "Kinnaur Royal", "Royal Gala"],
        min_rate: 78.0,
        max_rate: 185.0,
        min_weight_per_caret: 17.0,
        max_weight_per_caret: 21.0,
    },
    FruitCatalogEntry {
        name: "Banana",
        varieties: &["Robusta", "Grand Naine", "Elaichi", "Poovan"],
        min_rate: 16.0,
        max_rate: 52.0,
        min_weight_per_caret: 12.0,
        max_weight_per_caret: 18.0,
    },
    FruitCatalogEntry {
        name: "Pomegranate",
        varieties: &["Bhagwa", "Ganesh", "Ruby", "Arakta"],
        min_rate: 65.0,
        max_rate: 155.0,
        min_weight_per_caret: 9.0,
        max_weight_per_caret: 14.0,
    },
    FruitCatalogEntry {
        name: "Grapes",
        varieties: &["Green Seedless", "Black Jumbo", "Sonaka", "Sharad Seedless"],
        min_rate: 28.0,
        max_rate: 98.0,
        min_weight_per_caret: 7.0,
        max_weight_per_caret: 12.0,
    },
    FruitCatalogEntry {
        name: "Orange",
        varieties: &["Nagpur Orange", "Kinnow", "Valencia"],
        min_rate: 24.0,
        max_rate: 68.0,
        min_weight_per_caret: 10.0,
        max_weight_per_caret: 16.0,
    },
    FruitCatalogEntry {
        name: "Mosambi",
        varieties: &["Sweet Lime", "Premium Sweet Lime", "APMC Select"],
        min_rate: 22.0,
        max_rate: 60.0,
        min_weight_per_caret: 10.0,
        max_weight_per_caret: 15.0,
    },
    FruitCatalogEntry {
        name: "Watermelon",
        varieties: &["Sugar Baby", "Kiran", "Namdhari Jumbo"],
        min_rate: 8.0,
        max_rate: 22.0,
        min_weight_per_caret: 18.0,
        max_weight_per_caret: 26.0,
    },
    FruitCatalogEntry {
        name: "Papaya",
        varieties: &["Red Lady", "Taiwan 786", "Local Gold"],
        min_rate: 18.0,
        max_rate: 46.0,
        min_weight_per_caret: 12.0,
        max_weight_per_caret: 18.0,
    },
    FruitCatalogEntry {
        name: "Guava",
        varieties: &["Allahabad Safeda", "Lalit", "Thai Pink"],
        min_rate: 26.0,
        max_rate: 72.0,
        min_weight_per_caret: 9.0,
        max_weight_per_caret: 14.0,
    },
    FruitCatalogEntry {
        name: "Pineapple",
        varieties: &["Queen", "Kew", "Mauritius"],
        min_rate: 24.0,
        max_rate: 64.0,
        min_weight_per_caret: 10.0,
        max_weight_per_caret: 16.0,
    },
    FruitCatalogEntry {
        name: "Pear",
        varieties: &["Patharnakh", "Babugosha", "Green Pear"],
        min_rate: 38.0,
        max_rate: 108.0,
        min_weight_per_caret: 9.0,
        max_weight_per_caret: 13.0,
    },
    FruitCatalogEntry {
        name: "Dragon Fruit",
        varieties: &["Red Flesh", "White Flesh", "Premium Box"],
        min_rate: 88.0,
        max_rate: 220.0,
        min_weight_per_caret: 5.0,
        max_weight_per_caret: 9.0,
    },
    FruitCatalogEntry {
        name: "Muskmelon",
        varieties: &["Punjab Hybrid", "Kharbuja Local", "Golden Net"],
        min_rate: 16.0,
        max_rate: 42.0,
        min_weight_per_caret: 14.0,
        max_weight_per_caret: 20.0,
    },
    FruitCatalogEntry {
        name: "Plum",
        varieties: &["Kala Plum", "Santa Rosa", "Himachal Mix"],
        min_rate: 48.0,
        max_rate: 132.0,
        min_weight_per_caret: 7.0,
        max_weight_per_caret: 11.0,
    },
    FruitCatalogEntry {
        name: "Kiwi",
        varieties: &["Hayward", "Green Gold", "Premium Tray"],
        min_rate: 120.0,
        max_rate: 260.0,
        min_weight_per_caret: 4.0,
        max_weight_per_caret: 7.0,
    },
];

const PROFILES: &[SeedProfileSpec] = &[
    SeedProfileSpec {
        key: "lightweight",
        display_name: "Lightweight",
        description: "Fast startup dataset for daily feature work and smoke tests.",
        recommended_for: "UI development, CRUD checks, invoice formatting, and quick manual QA.",
        approx_history_days: 60,
        fruits: 8,
        suppliers: 18,
        customers: 28,
        vehicle_arrivals: 42,
        purchase_invoices: 54,
        sales_invoices: 72,
        payments: 64,
        rng_seed: 11,
    },
    SeedProfileSpec {
        key: "medium",
        display_name: "Medium",
        description: "Balanced dataset for integration testing across reports, ledgers, and searches.",
        recommended_for: "Most desktop QA cycles, ledger validation, exports, and pagination checks.",
        approx_history_days: 180,
        fruits: 12,
        suppliers: 40,
        customers: 70,
        vehicle_arrivals: 160,
        purchase_invoices: 220,
        sales_invoices: 320,
        payments: 260,
        rng_seed: 29,
    },
    SeedProfileSpec {
        key: "heavy",
        display_name: "Heavy",
        description: "Large dataset tuned for realistic reporting, filtering, and offline desktop performance testing.",
        recommended_for: "Report validation, stress testing, search latency checks, and backup/restore drills.",
        approx_history_days: 365,
        fruits: 16,
        suppliers: 90,
        customers: 160,
        vehicle_arrivals: 520,
        purchase_invoices: 720,
        sales_invoices: 1020,
        payments: 860,
        rng_seed: 53,
    },
];

pub fn seed_plan() -> SeedPlanResponse {
    SeedPlanResponse {
        recommended_default: "medium".to_string(),
        profiles: PROFILES.iter().map(to_profile_recommendation).collect(),
        scaling_strategy: "Start with lightweight for local UI work, move to medium for full ERP workflows, and reserve heavy for reports, backup/restore, and performance-focused offline regression runs.".to_string(),
        notes: vec![
            "Reseeding is deterministic per profile, so reset + reseed produces stable document references for repeatable tests.".to_string(),
            "All write operations run inside a single SQLite transaction to avoid partial datasets after failure.".to_string(),
            "Sales invoices consume generated stock pools so reports exercise realistic inventory movement rather than isolated random documents.".to_string(),
        ],
    }
}

pub fn reset_demo_data(conn: &mut Connection) -> AppResult<SeedResetResponse> {
    let tx = conn.transaction().map_err(db_err)?;
    let deleted_counts = count_existing(&tx)?;
    clear_erp_tables(&tx)?;
    tx.commit().map_err(db_err)?;

    Ok(SeedResetResponse {
        deleted_counts,
        reset_at: timestamp_now(),
    })
}

pub fn reseed_demo_data(conn: &mut Connection, profile: &str) -> AppResult<SeedExecutionResponse> {
    let spec = find_profile(profile)?;
    let tx = conn.transaction().map_err(db_err)?;
    let deleted_counts = count_existing(&tx)?;
    clear_erp_tables(&tx)?;

    let build = build_dataset(&tx, spec)?;
    tx.commit().map_err(db_err)?;

    Ok(SeedExecutionResponse {
        profile: spec.key.to_string(),
        reset_performed: true,
        deleted_counts,
        inserted_counts: build.inserted_counts,
        started_on: build.started_on,
        ended_on: build.ended_on,
        seeded_at: timestamp_now(),
        company_name: build.company_name,
        settings_keys: vec![
            SETTINGS_KEY_APP.to_string(),
            SETTINGS_KEY_COMPANIES.to_string(),
            SETTINGS_KEY_ACTIVE_COMPANY.to_string(),
            SETTINGS_KEY_SEED_META.to_string(),
        ],
    })
}

fn to_profile_recommendation(spec: &SeedProfileSpec) -> SeedProfileRecommendation {
    SeedProfileRecommendation {
        key: spec.key.to_string(),
        display_name: spec.display_name.to_string(),
        description: spec.description.to_string(),
        recommended_for: spec.recommended_for.to_string(),
        approx_history_days: spec.approx_history_days,
        counts: SeedTableCounts {
            fruits: spec.fruits,
            suppliers: spec.suppliers,
            customers: spec.customers,
            vehicle_arrivals: spec.vehicle_arrivals,
            purchase_invoices: spec.purchase_invoices,
            sales_invoices: spec.sales_invoices,
            payments: spec.payments,
            app_settings: 4,
        },
    }
}

fn find_profile(key: &str) -> AppResult<SeedProfileSpec> {
    PROFILES
        .iter()
        .find(|profile| profile.key.eq_ignore_ascii_case(key))
        .copied()
        .ok_or_else(|| AppError::Validation(format!(
            "Unknown seed profile '{key}'. Expected one of: lightweight, medium, heavy"
        )))
}

fn count_existing(tx: &Transaction<'_>) -> AppResult<SeedTableCounts> {
    Ok(SeedTableCounts {
        fruits: count_table(tx, "fruits")?,
        suppliers: count_table(tx, "suppliers")?,
        customers: count_table(tx, "customers")?,
        vehicle_arrivals: count_table(tx, "vehicle_arrivals")?,
        purchase_invoices: count_table(tx, "purchase_invoices")?,
        sales_invoices: count_table(tx, "invoices")?,
        payments: count_table(tx, "payments")?,
        app_settings: count_table(tx, "app_settings")?,
    })
}

fn count_table(tx: &Transaction<'_>, table: &str) -> AppResult<u32> {
    let sql = format!("SELECT COUNT(*) FROM {table}");
    tx.query_row(&sql, [], |row| row.get::<_, i64>(0))
        .map(|value| value as u32)
        .map_err(db_err)
}

fn clear_erp_tables(tx: &Transaction<'_>) -> AppResult<()> {
    tx.execute("DELETE FROM payments", []).map_err(db_err)?;
    tx.execute("DELETE FROM invoices", []).map_err(db_err)?;
    tx.execute("DELETE FROM purchase_invoices", []).map_err(db_err)?;
    tx.execute("DELETE FROM vehicle_arrivals", []).map_err(db_err)?;
    tx.execute("DELETE FROM customers", []).map_err(db_err)?;
    tx.execute("DELETE FROM suppliers", []).map_err(db_err)?;
    tx.execute("DELETE FROM fruits", []).map_err(db_err)?;
    tx.execute("DELETE FROM app_settings", []).map_err(db_err)?;
    Ok(())
}

struct DatasetBuildResult {
    inserted_counts: SeedTableCounts,
    started_on: String,
    ended_on: String,
    company_name: String,
}

fn build_dataset(tx: &Transaction<'_>, spec: SeedProfileSpec) -> AppResult<DatasetBuildResult> {
    let mut rng = SeedRng::new(spec.rng_seed);
    let today = Utc::now().date_naive();
    let start_date = today - Duration::days(spec.approx_history_days as i64);
    let fruits = build_fruits(spec);
    let suppliers = build_suppliers(spec, &mut rng);
    let customers = build_customers(spec, &mut rng);

    insert_fruits(tx, &fruits)?;
    insert_suppliers(tx, &suppliers)?;
    insert_customers(tx, &customers)?;

    let mut stock = BTreeMap::<String, StockBucket>::new();
    let mut supplier_balances = suppliers
        .iter()
        .map(|supplier| (supplier.id.clone(), supplier.previous_balance))
        .collect::<BTreeMap<_, _>>();
    let mut customer_balances = customers
        .iter()
        .map(|customer| (customer.id.clone(), customer.previous_balance))
        .collect::<BTreeMap<_, _>>();

    insert_vehicle_arrivals(
        tx,
        spec,
        start_date,
        &fruits,
        &suppliers,
        &mut stock,
        &mut rng,
    )?;

    insert_purchase_invoices(
        tx,
        spec,
        start_date,
        &fruits,
        &suppliers,
        &mut supplier_balances,
        &mut stock,
        &mut rng,
    )?;

    insert_sales_invoices(
        tx,
        spec,
        start_date,
        &customers,
        &mut customer_balances,
        &mut stock,
        &mut rng,
    )?;

    insert_payments(
        tx,
        spec,
        start_date,
        &suppliers,
        &customers,
        &mut supplier_balances,
        &mut customer_balances,
        &mut rng,
    )?;

    let company_name = seed_settings(tx, spec, start_date, today)?;

    Ok(DatasetBuildResult {
        inserted_counts: SeedTableCounts {
            fruits: spec.fruits,
            suppliers: spec.suppliers,
            customers: spec.customers,
            vehicle_arrivals: spec.vehicle_arrivals,
            purchase_invoices: spec.purchase_invoices,
            sales_invoices: spec.sales_invoices,
            payments: spec.payments,
            app_settings: 4,
        },
        started_on: start_date.format("%Y-%m-%d").to_string(),
        ended_on: today.format("%Y-%m-%d").to_string(),
        company_name,
    })
}

fn build_fruits(spec: SeedProfileSpec) -> Vec<FruitSeed> {
    FRUIT_CATALOG
        .iter()
        .take(spec.fruits as usize)
        .enumerate()
        .map(|(index, entry)| FruitSeed {
            id: format!("fruit-{:03}", index + 1),
            name: entry.name.to_string(),
            varieties: entry.varieties.iter().map(|value| (*value).to_string()).collect(),
            min_rate: entry.min_rate,
            max_rate: entry.max_rate,
            min_weight_per_caret: entry.min_weight_per_caret,
            max_weight_per_caret: entry.max_weight_per_caret,
        })
        .collect()
}

fn build_suppliers(spec: SeedProfileSpec, rng: &mut SeedRng) -> Vec<SupplierSeed> {
    const PREFIXES: &[&str] = &[
        "Patel", "Sharma", "Desai", "Reddy", "Naik", "Bhai", "Grewal", "Pawar",
        "Chaudhary", "Sanghvi", "Mistry", "Kulkarni",
    ];
    const SUFFIXES: &[&str] = &[
        "Agro Traders", "Fruit Commission", "Orchard Link", "Farm Fresh", "Produce Network",
        "Harvest Yard", "Growers Collective", "Fresh Box Supply",
    ];
    const CITIES: &[&str] = &[
        "Valsad, Gujarat", "Navsari, Gujarat", "Nashik, Maharashtra", "Jalgaon, Maharashtra",
        "Solapur, Maharashtra", "Shimla, Himachal Pradesh", "Pune, Maharashtra",
        "Sangli, Maharashtra", "Anand, Gujarat", "Satara, Maharashtra", "Indore, Madhya Pradesh",
        "Hubli, Karnataka",
    ];

    (0..spec.suppliers)
        .map(|index| {
            let city = CITIES[index as usize % CITIES.len()].to_string();
            let name = format!(
                "{} {} ({})",
                PREFIXES[index as usize % PREFIXES.len()],
                SUFFIXES[(index as usize / PREFIXES.len()) % SUFFIXES.len()],
                city.split(',').next().unwrap_or("Yard"),
            );

            SupplierSeed {
                id: format!("sup-{:03}", index + 1),
                name,
                code: format!("SUP-{:03}", index + 1),
                phone: format!("+91 9{:09}", 100000000 + index),
                city,
                previous_balance: round2(rng.range_f64(-25000.0, 180000.0)),
            }
        })
        .collect()
}

fn build_customers(spec: SeedProfileSpec, rng: &mut SeedRng) -> Vec<CustomerSeed> {
    const PREFIXES: &[&str] = &[
        "Metro", "Daily", "Fresh", "Royal", "Green", "Omkar", "Prime", "City",
        "Budget", "Harvest", "Market", "Golden",
    ];
    const SUFFIXES: &[&str] = &[
        "Supermarkets", "Wholesalers", "Retail Chain", "Fruit Bazaar", "Fresh Mart",
        "Trading Co", "Hypermart", "Food Stores",
    ];
    const CITIES: &[&str] = &[
        "Mumbai", "Surat", "Pune", "Ahmedabad", "Vadodara", "Rajkot", "Navi Mumbai",
        "Thane", "Aurangabad", "Nagpur", "Indore", "Udaipur",
    ];

    (0..spec.customers)
        .map(|index| CustomerSeed {
            id: format!("cus-{:03}", index + 1),
            name: format!(
                "{} {}",
                PREFIXES[index as usize % PREFIXES.len()],
                SUFFIXES[(index as usize / PREFIXES.len()) % SUFFIXES.len()],
            ),
            phone: format!("+91 8{:09}", 100000000 + index),
            city: CITIES[index as usize % CITIES.len()].to_string(),
            previous_balance: round2(rng.range_f64(0.0, 240000.0)),
        })
        .collect()
}

fn insert_fruits(tx: &Transaction<'_>, fruits: &[FruitSeed]) -> AppResult<()> {
    let mut stmt = tx
        .prepare("INSERT INTO fruits (id, name, varieties) VALUES (?1, ?2, ?3)")
        .map_err(db_err)?;
    for fruit in fruits {
        stmt.execute(params![fruit.id, fruit.name, serde_json::to_string(&fruit.varieties)?])
            .map_err(db_err)?;
    }
    Ok(())
}

fn insert_suppliers(tx: &Transaction<'_>, suppliers: &[SupplierSeed]) -> AppResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO suppliers (id, name, code, phone, city, previous_balance)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .map_err(db_err)?;
    for supplier in suppliers {
        stmt.execute(params![
            supplier.id,
            supplier.name,
            supplier.code,
            supplier.phone,
            supplier.city,
            supplier.previous_balance,
        ])
        .map_err(db_err)?;
    }
    Ok(())
}

fn insert_customers(tx: &Transaction<'_>, customers: &[CustomerSeed]) -> AppResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO customers (id, name, phone, city, previous_balance)
             VALUES (?1, ?2, ?3, ?4, ?5)",
        )
        .map_err(db_err)?;
    for customer in customers {
        stmt.execute(params![
            customer.id,
            customer.name,
            customer.phone,
            customer.city,
            customer.previous_balance,
        ])
        .map_err(db_err)?;
    }
    Ok(())
}

fn insert_vehicle_arrivals(
    tx: &Transaction<'_>,
    spec: SeedProfileSpec,
    start_date: NaiveDate,
    fruits: &[FruitSeed],
    suppliers: &[SupplierSeed],
    stock: &mut BTreeMap<String, StockBucket>,
    rng: &mut SeedRng,
) -> AppResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO vehicle_arrivals
             (id, arrival_no, date, day, vehicle_no, vehicle_name, fruit_type,
              total_vehicle_weight, driver_name, notes, rows, total_carets,
              total_calculated_weight, total_amount, freight_charge, hamali_charge,
              advance_paid, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
        )
        .map_err(db_err)?;

    for index in 0..spec.vehicle_arrivals {
        let date = shift_date(start_date, spec.approx_history_days, index, 1, rng);
        let fruit = &fruits[rng.range_usize(0, fruits.len())];
        let row_count = rng.range_usize(2, 5);
        let mut rows = Vec::with_capacity(row_count);
        let mut total_carets = 0.0;
        let mut total_weight = 0.0;
        let mut total_amount = 0.0;

        for row_index in 0..row_count {
            let supplier = &suppliers[rng.range_usize(0, suppliers.len())];
            let variety = fruit.varieties[rng.range_usize(0, fruit.varieties.len())].clone();
            let caret = round2(rng.range_f64(18.0, 90.0));
            let unit_weight = rng.range_f64(fruit.min_weight_per_caret, fruit.max_weight_per_caret);
            let weight = round2(caret * unit_weight);
            let rate = round2(rng.range_f64(fruit.min_rate, fruit.max_rate));
            let amount = round2(weight * rate);

            total_carets += caret;
            total_weight += weight;
            total_amount += amount;

            add_stock(stock, &fruit.name, &variety, weight, caret, rate);

            rows.push(VehicleRowJson {
                id: format!("arrival-row-{}-{}", index + 1, row_index + 1),
                supplier_id: supplier.id.clone(),
                supplier_name: supplier.name.clone(),
                variety,
                caret,
                weight,
                rate,
                amount,
                note: Some(vehicle_note(index as usize, row_index)),
            });
        }

        let freight = Some(round2(rng.range_f64(1800.0, 8200.0)));
        let hamali = Some(round2(rng.range_f64(350.0, 2100.0)));
        let advance = if index % 3 == 0 {
            Some(round2(rng.range_f64(0.0, 12000.0)))
        } else {
            None
        };

        stmt.execute(params![
            format!("arrival-{:04}", index + 1),
            format!("ARR-{}-{:04}", date.year(), index + 1),
            date.format("%Y-%m-%d").to_string(),
            date.format("%A").to_string(),
            vehicle_no(index as usize),
            vehicle_name(index as usize),
            fruit.name,
            round2(total_weight + rng.range_f64(25.0, 160.0)),
            driver_name(index as usize),
            format!("{} consignment for {} window", vehicle_note(index as usize, 0), fruit.name),
            serde_json::to_string(&rows)?,
            round2(total_carets),
            round2(total_weight),
            round2(total_amount),
            freight,
            hamali,
            advance,
            "SAVED",
            timestamp_for(date, 6 + (index % 10), 10 + (index % 45)),
        ])
        .map_err(db_err)?;
    }

    Ok(())
}

fn insert_purchase_invoices(
    tx: &Transaction<'_>,
    spec: SeedProfileSpec,
    start_date: NaiveDate,
    fruits: &[FruitSeed],
    suppliers: &[SupplierSeed],
    balances: &mut BTreeMap<String, f64>,
    stock: &mut BTreeMap<String, StockBucket>,
    rng: &mut SeedRng,
) -> AppResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO purchase_invoices
             (id, bill_no, date, supplier_id, supplier_name, items,
              previous_balance, today_amount, freight, hamali,
              paid_amount, remaining_balance, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        )
        .map_err(db_err)?;

    for index in 0..spec.purchase_invoices {
        let date = shift_date(start_date, spec.approx_history_days, index, 2, rng);
        let supplier = &suppliers[rng.range_usize(0, suppliers.len())];
        let item_count = rng.range_usize(2, 5);
        let mut items = Vec::with_capacity(item_count);
        let mut today_amount = 0.0;

        for item_index in 0..item_count {
            let fruit = &fruits[rng.range_usize(0, fruits.len())];
            let variety = fruit.varieties[rng.range_usize(0, fruit.varieties.len())].clone();
            let caret = round2(rng.range_f64(10.0, 48.0));
            let weight = round2(caret * rng.range_f64(fruit.min_weight_per_caret, fruit.max_weight_per_caret));
            let rate = round2(rng.range_f64(fruit.min_rate, fruit.max_rate));
            let amount = round2(weight * rate);
            today_amount += amount;
            add_stock(stock, &fruit.name, &variety, weight, caret, rate);

            items.push(PurchaseInvoiceItemJson {
                id: format!("purchase-item-{}-{}", index + 1, item_index + 1),
                fruit: fruit.name.clone(),
                variety,
                caret,
                weight,
                rate,
                amount,
            });
        }

        let previous_balance = *balances.get(&supplier.id).unwrap_or(&0.0);
        let paid_amount = if index % 4 == 0 {
            0.0
        } else {
            round2(today_amount * rng.range_f64(0.18, 0.72))
        };
        let remaining_balance = round2(previous_balance + today_amount - paid_amount);
        balances.insert(supplier.id.clone(), remaining_balance);

        stmt.execute(params![
            format!("purchase-{:04}", index + 1),
            format!("PUR-{}-{:04}", date.year(), 101 + index),
            date.format("%Y-%m-%d").to_string(),
            supplier.id,
            supplier.name,
            serde_json::to_string(&items)?,
            round2(previous_balance),
            round2(today_amount),
            Some(round2(rng.range_f64(0.0, 4200.0))),
            Some(round2(rng.range_f64(0.0, 1800.0))),
            round2(paid_amount),
            remaining_balance,
            format!("Purchase bill posted against {} lane supply", supplier.city),
            timestamp_for(date, 10 + (index % 8), 15 + (index % 40)),
        ])
        .map_err(db_err)?;
    }

    Ok(())
}

fn insert_sales_invoices(
    tx: &Transaction<'_>,
    spec: SeedProfileSpec,
    start_date: NaiveDate,
    customers: &[CustomerSeed],
    balances: &mut BTreeMap<String, f64>,
    stock: &mut BTreeMap<String, StockBucket>,
    rng: &mut SeedRng,
) -> AppResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO invoices
             (id, invoice_no, date, customer_id, customer_name, items,
              previous_balance, today_amount, hamali, discount,
              paid_amount, remaining_balance, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        )
        .map_err(db_err)?;

    for index in 0..spec.sales_invoices {
        let date = shift_date(start_date, spec.approx_history_days, index, 3, rng);
        let customer = &customers[rng.range_usize(0, customers.len())];
        let item_count = rng.range_usize(2, 5);
        let items = take_sales_items(stock, rng, item_count);
        let today_amount = round2(items.iter().map(|item| item.amount).sum());
        let previous_balance = *balances.get(&customer.id).unwrap_or(&0.0);
        let paid_amount = if index % 5 == 0 {
            0.0
        } else {
            round2(today_amount * rng.range_f64(0.12, 0.78))
        };
        let remaining_balance = round2(previous_balance + today_amount - paid_amount);
        balances.insert(customer.id.clone(), remaining_balance);

        stmt.execute(params![
            format!("invoice-{:04}", index + 1),
            format!("INV-{}-{:04}", date.year(), 1001 + index),
            date.format("%Y-%m-%d").to_string(),
            customer.id,
            customer.name,
            serde_json::to_string(&items)?,
            round2(previous_balance),
            today_amount,
            Some(round2(rng.range_f64(0.0, 1600.0))),
            if index % 6 == 0 {
                Some(round2(today_amount * rng.range_f64(0.01, 0.05)))
            } else {
                None
            },
            paid_amount,
            remaining_balance,
            format!("Route dispatch for {} market coverage", customer.city),
            timestamp_for(date, 13 + (index % 7), 5 + (index % 50)),
        ])
        .map_err(db_err)?;
    }

    Ok(())
}

fn insert_payments(
    tx: &Transaction<'_>,
    spec: SeedProfileSpec,
    start_date: NaiveDate,
    suppliers: &[SupplierSeed],
    customers: &[CustomerSeed],
    supplier_balances: &mut BTreeMap<String, f64>,
    customer_balances: &mut BTreeMap<String, f64>,
    rng: &mut SeedRng,
) -> AppResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO payments
             (id, date, party_type, party_id, party_name, amount, payment_mode, reference_no, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        )
        .map_err(db_err)?;

    for index in 0..spec.payments {
        let date = shift_date(start_date, spec.approx_history_days, index, 2, rng);
        let for_customer = index % 5 < 3;
        let (party_type, party_id, party_name, amount) = if for_customer {
            let customer = pick_customer_with_balance(customers, customer_balances, rng);
            let amount = payment_amount(customer_balances.get(&customer.id).copied().unwrap_or(0.0), rng);
            let next_balance = round2(customer_balances.get(&customer.id).copied().unwrap_or(0.0) - amount);
            customer_balances.insert(customer.id.clone(), next_balance);
            ("CUSTOMER", customer.id.clone(), customer.name.clone(), amount)
        } else {
            let supplier = pick_supplier_with_balance(suppliers, supplier_balances, rng);
            let amount = payment_amount(supplier_balances.get(&supplier.id).copied().unwrap_or(0.0), rng);
            let next_balance = round2(supplier_balances.get(&supplier.id).copied().unwrap_or(0.0) - amount);
            supplier_balances.insert(supplier.id.clone(), next_balance);
            ("SUPPLIER", supplier.id.clone(), supplier.name.clone(), amount)
        };

        let payment_mode = payment_mode(index as usize);

        stmt.execute(params![
            format!("payment-{:04}", index + 1),
            date.format("%Y-%m-%d").to_string(),
            party_type,
            party_id,
            party_name,
            amount,
            payment_mode,
            payment_reference(payment_mode, index as usize),
            format!("{} settlement through {}", party_type, payment_mode.to_lowercase().replace('_', " ")),
        ])
        .map_err(db_err)?;
    }

    Ok(())
}

fn seed_settings(
    tx: &Transaction<'_>,
    spec: SeedProfileSpec,
    start_date: NaiveDate,
    end_date: NaiveDate,
) -> AppResult<String> {
    let company_name = "Nexus Fresh Commission Agents".to_string();
    let app_settings = json!({
        "company": {
            "name": company_name,
            "tagline": "Wholesale fruit merchants and commission agents",
            "address": "APMC Yard, Gate 3, Market Line Road",
            "phone": "+91 98765 00001",
            "email": "ops@nexusfresh.local",
            "gstin": "24ABCDE1234F1ZX",
            "bankName": "State Bank of India",
            "accountNo": "458901230001",
            "ifsc": "SBIN0004589",
            "upiId": "nexusfresh@upi",
            "logo": ""
        },
        "financial": {
            "financialYearStart": "04-01",
            "currency": "INR",
            "commissionRate": 8,
            "defaultHamali": 0,
            "defaultFreight": 0
        },
        "invoice": {
            "salesPrefix": "INV",
            "purchasePrefix": "PUR",
            "arrivalPrefix": "ARR",
            "salesNextNo": 1001 + spec.sales_invoices,
            "purchaseNextNo": 101 + spec.purchase_invoices,
            "arrivalNextNo": 1 + spec.vehicle_arrivals,
            "termsText": "Subject to APMC market yard rules. Goods once sold will not be taken back.",
            "footerNote": "Generated from deterministic offline demo dataset",
            "showUPI": true,
            "showBankDetails": true,
            "templateStyle": "modern",
            "brandColor": "#15803d",
            "enableQR": true,
            "autoInvoiceNo": true,
            "invoiceNumberMode": "sequential",
            "businessPrefix": "NX",
            "defaultTaxRate": 0,
            "paymentDueDays": 15,
            "showCompanyDetails": true,
            "showPaymentDetails": true,
            "watermarkType": "none",
            "watermarkText": "",
            "watermarkImage": "",
            "watermarkOpacity": 0.08,
            "watermarkSize": 110,
            "watermarkPosition": "center",
            "watermarkRepeat": false,
            "signatureImage": "",
            "invoiceLogo": "",
            "enableInvoiceLogo": false
        },
        "security": {
            "appPin": "",
            "autoLockMinutes": 0,
            "pinEnabled": false
        }
    });

    let companies = json!([
        {
            "id": "co-demo-main",
            "company": app_settings["company"].clone(),
            "financial": app_settings["financial"].clone(),
            "invoice": app_settings["invoice"].clone(),
            "createdAt": timestamp_now(),
            "pan": "ABCDE1234F",
            "city": "Surat",
            "state": "Gujarat",
            "pincode": "395003",
            "logo": ""
        }
    ]);

    let seed_meta = json!({
        "profile": spec.key,
        "seededAt": timestamp_now(),
        "dateRange": {
            "from": start_date.format("%Y-%m-%d").to_string(),
            "to": end_date.format("%Y-%m-%d").to_string()
        },
        "recommendedCounts": to_profile_recommendation(&spec).counts,
        "strategy": seed_plan().scaling_strategy,
        "notes": seed_plan().notes,
    });

    let entries = vec![
        (SETTINGS_KEY_APP, app_settings),
        (SETTINGS_KEY_COMPANIES, companies),
        (SETTINGS_KEY_ACTIVE_COMPANY, json!("co-demo-main")),
        (SETTINGS_KEY_SEED_META, seed_meta),
    ];

    let mut stmt = tx
        .prepare("INSERT INTO app_settings (key, value) VALUES (?1, ?2)")
        .map_err(db_err)?;
    for (key, value) in entries {
        stmt.execute(params![key, value.to_string()]).map_err(db_err)?;
    }

    Ok(company_name)
}

fn shift_date(
    start_date: NaiveDate,
    total_days: u32,
    index: u32,
    stride: u32,
    rng: &mut SeedRng,
) -> NaiveDate {
    let span = total_days.max(1) as i64;
    let offset = ((index * stride) as i64 + (rng.range_usize(0, 3) as i64)).rem_euclid(span);
    start_date + Duration::days(offset)
}

fn take_sales_items(
    stock: &mut BTreeMap<String, StockBucket>,
    rng: &mut SeedRng,
    desired_count: usize,
) -> Vec<SalesInvoiceItemJson> {
    let mut items = Vec::new();

    for item_index in 0..desired_count {
        let keys = stock
            .iter()
            .filter(|(_, bucket)| bucket.available_weight > 45.0)
            .map(|(key, _)| key.clone())
            .collect::<Vec<_>>();
        if keys.is_empty() {
            break;
        }

        let key = &keys[rng.range_usize(0, keys.len())];
        if let Some(bucket) = stock.get_mut(key) {
            let max_weight = bucket.available_weight.min(rng.range_f64(65.0, 220.0));
            let weight = round2(max_weight.max(25.0));
            let caret_ratio = if bucket.available_weight <= 0.0 {
                0.0
            } else {
                weight / bucket.available_weight
            };
            let caret = round2((bucket.available_carets * caret_ratio).max(2.0));
            let rate = round2(bucket.last_rate * rng.range_f64(1.14, 1.44));
            let amount = round2(weight * rate);

            bucket.available_weight = round2((bucket.available_weight - weight).max(0.0));
            bucket.available_carets = round2((bucket.available_carets - caret).max(0.0));

            items.push(SalesInvoiceItemJson {
                id: format!("sales-item-{}", item_index + 1),
                fruit: bucket.fruit.clone(),
                lot_variety: bucket.variety.clone(),
                caret,
                weight,
                rate,
                amount,
            });
        }
    }

    if items.is_empty() {
        items.push(SalesInvoiceItemJson {
            id: "sales-item-fallback".to_string(),
            fruit: "Mixed Fruit".to_string(),
            lot_variety: "General".to_string(),
            caret: 10.0,
            weight: 100.0,
            rate: 55.0,
            amount: 5500.0,
        });
    }

    items
}

fn add_stock(
    stock: &mut BTreeMap<String, StockBucket>,
    fruit: &str,
    variety: &str,
    weight: f64,
    carets: f64,
    rate: f64,
) {
    let key = format!("{}::{}", fruit, variety);
    let entry = stock.entry(key).or_insert_with(|| StockBucket {
        fruit: fruit.to_string(),
        variety: variety.to_string(),
        available_weight: 0.0,
        available_carets: 0.0,
        last_rate: rate,
    });
    entry.available_weight = round2(entry.available_weight + weight);
    entry.available_carets = round2(entry.available_carets + carets);
    entry.last_rate = rate;
}

fn pick_customer_with_balance<'a>(
    customers: &'a [CustomerSeed],
    balances: &BTreeMap<String, f64>,
    rng: &mut SeedRng,
) -> &'a CustomerSeed {
    let eligible = customers
        .iter()
        .filter(|customer| balances.get(&customer.id).copied().unwrap_or(0.0) > 2000.0)
        .collect::<Vec<_>>();

    if eligible.is_empty() {
        &customers[rng.range_usize(0, customers.len())]
    } else {
        eligible[rng.range_usize(0, eligible.len())]
    }
}

fn pick_supplier_with_balance<'a>(
    suppliers: &'a [SupplierSeed],
    balances: &BTreeMap<String, f64>,
    rng: &mut SeedRng,
) -> &'a SupplierSeed {
    let eligible = suppliers
        .iter()
        .filter(|supplier| balances.get(&supplier.id).copied().unwrap_or(0.0) > 2000.0)
        .collect::<Vec<_>>();

    if eligible.is_empty() {
        &suppliers[rng.range_usize(0, suppliers.len())]
    } else {
        eligible[rng.range_usize(0, eligible.len())]
    }
}

fn payment_amount(balance: f64, rng: &mut SeedRng) -> f64 {
    if balance <= 0.0 {
        return round2(rng.range_f64(2500.0, 12000.0));
    }

    round2((balance * rng.range_f64(0.16, 0.48)).clamp(2500.0, balance.min(95000.0)))
}

fn payment_mode(index: usize) -> &'static str {
    match index % 4 {
        0 => "CASH",
        1 => "BANK_TRANSFER",
        2 => "UPI",
        _ => "CHEQUE",
    }
}

fn payment_reference(mode: &str, index: usize) -> Option<String> {
    match mode {
        "CASH" => None,
        "BANK_TRANSFER" => Some(format!("NEFT{:06}", index + 1)),
        "UPI" => Some(format!("UPI{:06}", index + 1)),
        _ => Some(format!("CHQ{:06}", index + 1)),
    }
}

fn vehicle_name(index: usize) -> &'static str {
    match index % 6 {
        0 => "Tata Prima Heavy Duty",
        1 => "Eicher Pro Cargo",
        2 => "Ashok Leyland 12-Wheeler",
        3 => "Mahindra Bolero Pickup",
        4 => "BharatBenz Reefer",
        _ => "Tata 407 Gold",
    }
}

fn vehicle_no(index: usize) -> String {
    format!(
        "{}-{:02}-{}-{:04}",
        ["GJ", "MH", "RJ", "KA", "MP", "DL"][index % 6],
        10 + (index % 25),
        ["AB", "CD", "EF", "GH", "JK", "LM"][index % 6],
        1200 + index
    )
}

fn driver_name(index: usize) -> &'static str {
    match index % 8 {
        0 => "Vikram Singh",
        1 => "Santosh Pawar",
        2 => "Dinesh Bharvad",
        3 => "Imran Sheikh",
        4 => "Ajit Chauhan",
        5 => "Raghav Solanki",
        6 => "Mahesh Patel",
        _ => "Gurpreet Singh",
    }
}

fn vehicle_note(index: usize, row_index: usize) -> String {
    let descriptors = [
        "Morning arrival",
        "APMC direct load",
        "Cold-chain consignment",
        "Ripening-chamber dispatch",
        "Premium grade lot",
        "Mixed wholesale load",
    ];
    format!("{} batch {}", descriptors[(index + row_index) % descriptors.len()], row_index + 1)
}

fn round2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn timestamp_now() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%S.000Z").to_string()
}

fn timestamp_for(date: NaiveDate, hour: u32, minute: u32) -> String {
    format!(
        "{}T{:02}:{:02}:00.000Z",
        date.format("%Y-%m-%d"),
        hour % 24,
        minute % 60,
    )
}

fn db_err(error: rusqlite::Error) -> AppError {
    AppError::Database(error.to_string())
}

#[derive(Debug, Clone)]
struct SeedRng {
    state: u64,
}

impl SeedRng {
    fn new(seed: u64) -> Self {
        Self { state: seed.max(1) }
    }

    fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_mul(6364136223846793005).wrapping_add(1);
        (self.state >> 32) as u32
    }

    fn range_usize(&mut self, start: usize, end: usize) -> usize {
        if end <= start {
            return start;
        }
        start + (self.next_u32() as usize % (end - start))
    }

    fn range_f64(&mut self, min: f64, max: f64) -> f64 {
        if max <= min {
            return min;
        }
        let unit = self.next_u32() as f64 / u32::MAX as f64;
        min + ((max - min) * unit)
    }
}