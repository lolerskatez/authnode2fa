#!/usr/bin/env python
"""List all database tables and OIDC config records"""

import sqlite3
import json

db_path = "authy.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\n=== Database Tables ===\n")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [row[0] for row in cursor.fetchall()]
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"  - {table} ({count} records)")

print("\n=== OIDC Config Records ===\n")
try:
    cursor.execute("SELECT * FROM oidc_config;")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    if rows:
        for row in rows:
            print("OIDC Config Record:")
            for col, val in zip(columns, row):
                if col in ['admin_groups', 'user_groups']:
                    try:
                        val = json.loads(val) if isinstance(val, str) else val
                    except:
                        pass
                print(f"  {col}: {val}")
            print()
    else:
        print("No OIDC config records found")
except Exception as e:
    print(f"Error querying OIDC config: {e}")

conn.close()
