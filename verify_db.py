#!/usr/bin/env python3
import sqlite3
import os
from pathlib import Path

# Database path
db_path = Path(os.getenv('APPDATA')) / 'in.asznexus.erp' / 'asz_nexus_erp.db'

print(f"Database path: {db_path}")
print(f"Database exists: {db_path.exists()}")
print(f"Database size: {db_path.stat().st_size if db_path.exists() else 'N/A'} bytes")
print()

if db_path.exists():
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # List all tables
        print("=== TABLES ===")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = cursor.fetchall()
        for table in tables:
            print(f"  - {table[0]}")
        
        print()
        
        # Show schema for each table
        for table in tables:
            table_name = table[0]
            print(f"=== TABLE: {table_name} ===")
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            for col in columns:
                print(f"  {col[1]} ({col[2]})")
            
            # Row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
            count = cursor.fetchone()[0]
            print(f"  Row count: {count}")
            print()
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
