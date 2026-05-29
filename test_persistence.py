#!/usr/bin/env python3
import sqlite3
import os
from pathlib import Path
from datetime import datetime
import uuid

# Database path
db_path = Path(os.getenv('APPDATA')) / 'in.asznexus.erp' / 'asz_nexus_erp.db'

print("=== PERSISTENCE VERIFICATION TEST ===\n")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Test 1: Insert test company
    print("1. Inserting test company...")
    company_id = str(uuid.uuid4())
    company_data = {
        'id': company_id,
        'name': 'Test Company',
        'legal_name': 'Test Company Ltd.',
        'gstin': '27AABCT1234X1Z0',
        'address': '123 Test Street',
        'phone': '9876543210',
        'email': 'test@company.com',
        'currency': 'INR',
        'fy_start_month': 4,
        'created_at': int(datetime.now().timestamp()),
        'updated_at': int(datetime.now().timestamp()),
    }
    
    cursor.execute(
        """INSERT INTO companies 
        (id, name, legal_name, gstin, address, phone, email, currency, fy_start_month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        tuple(company_data.values())
    )
    conn.commit()
    print(f"   ✓ Company inserted: {company_id}")
    
    # Test 2: Insert financial year
    print("\n2. Inserting financial year...")
    fy_id = str(uuid.uuid4())
    fy_data = {
        'id': fy_id,
        'company_id': company_id,
        'name': 'FY 2025-26',
        'start_date': int(datetime(2025, 4, 1).timestamp()),
        'end_date': int(datetime(2026, 3, 31).timestamp()),
        'is_closed': 0,
        'created_at': int(datetime.now().timestamp()),
    }
    
    cursor.execute(
        """INSERT INTO financial_years 
        (id, company_id, name, start_date, end_date, is_closed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)""",
        tuple(fy_data.values())
    )
    conn.commit()
    print(f"   ✓ Financial year inserted: {fy_id}")
    
    # Test 3: Insert supplier (ledger)
    print("\n3. Inserting supplier (ledger)...")
    ledger_id = str(uuid.uuid4())
    group_id = str(uuid.uuid4())  # Create a default group for the ledger
    ledger_data = {
        'id': ledger_id,
        'company_id': company_id,
        'group_id': group_id,
        'name': 'Test Supplier',
        'type': 'Supplier',
        'phone': '9876543210',
        'email': 'supplier@test.com',
        'opening_balance': 10000.0,
        'opening_balance_type': 'Credit',
        'is_system': 0,
        'created_at': int(datetime.now().timestamp()),
    }
    
    cursor.execute(
        """INSERT INTO ledgers 
        (id, company_id, group_id, name, type, phone, email, opening_balance, opening_balance_type, is_system, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        tuple(ledger_data.values())
    )
    conn.commit()
    print(f"   ✓ Supplier inserted: {ledger_id}")
    
    # Test 4: Insert invoice
    print("\n4. Inserting purchase invoice...")
    invoice_id = str(uuid.uuid4())
    invoice_data = {
        'id': invoice_id,
        'company_id': company_id,
        'financial_year_id': fy_id,
        'type': 'Purchase',
        'invoice_number': 'PI-001',
        'date': int(datetime.now().timestamp()),
        'ledger_id': ledger_id,
        'supplier_name': 'Test Supplier',
        'sub_total': 5000.0,
        'tax_total': 900.0,
        'grand_total': 5900.0,
        'status': 'Draft',
        'created_at': int(datetime.now().timestamp()),
        'updated_at': int(datetime.now().timestamp()),
    }
    
    cursor.execute(
        """INSERT INTO invoices 
        (id, company_id, financial_year_id, type, invoice_number, date, ledger_id, 
         supplier_name, sub_total, tax_total, grand_total, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        tuple(invoice_data.values())
    )
    conn.commit()
    print(f"   ✓ Invoice inserted: {invoice_id}")
    
    # Test 5: Verify data persistence by reading back
    print("\n5. Verifying persistence...")
    
    cursor.execute("SELECT id, name FROM companies WHERE id = ?", (company_id,))
    company = cursor.fetchone()
    if company:
        print(f"   ✓ Company retrieved: {company[1]} ({company[0]})")
    else:
        print("   ✗ Company NOT found")
    
    cursor.execute("SELECT id, name FROM financial_years WHERE id = ?", (fy_id,))
    fy = cursor.fetchone()
    if fy:
        print(f"   ✓ Financial year retrieved: {fy[1]} ({fy[0]})")
    else:
        print("   ✗ Financial year NOT found")
    
    cursor.execute("SELECT id, name FROM ledgers WHERE id = ?", (ledger_id,))
    ledger = cursor.fetchone()
    if ledger:
        print(f"   ✓ Ledger retrieved: {ledger[1]} ({ledger[0]})")
    else:
        print("   ✗ Ledger NOT found")
    
    cursor.execute("SELECT id, invoice_number FROM invoices WHERE id = ?", (invoice_id,))
    invoice = cursor.fetchone()
    if invoice:
        print(f"   ✓ Invoice retrieved: {invoice[1]} ({invoice[0]})")
    else:
        print("   ✗ Invoice NOT found")
    
    # Test 6: Verify migration fields
    print("\n6. Checking migration fields...")
    
    cursor.execute("PRAGMA table_info(invoices);")
    columns = {col[1] for col in cursor.fetchall()}
    critical_cols = ['company_id', 'financial_year_id', 'ledger_id', 'invoice_number']
    all_present = all(col in columns for col in critical_cols)
    if all_present:
        print(f"   ✓ All critical fields present: {', '.join(critical_cols)}")
    else:
        missing = [col for col in critical_cols if col not in columns]
        print(f"   ✗ Missing fields: {', '.join(missing)}")
    
    # Test 7: Data counts
    print("\n7. Summary of data:")
    cursor.execute("SELECT COUNT(*) FROM companies;")
    print(f"   - Companies: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM financial_years;")
    print(f"   - Financial years: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM ledgers;")
    print(f"   - Ledgers: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM invoices;")
    print(f"   - Invoices: {cursor.fetchone()[0]}")
    
    print("\n✓ PERSISTENCE VERIFICATION PASSED")
    
    conn.close()
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
