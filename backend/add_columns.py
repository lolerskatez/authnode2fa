import sqlite3
from sqlalchemy import create_engine, inspect

# Check columns via SQLAlchemy
engine = create_engine('sqlite:///app.db')
inspector = inspect(engine)

columns = inspector.get_columns('global_settings')
print("Current columns in global_settings:")
for col in columns:
    print(f"  {col['name']} - {col['type']}")

has_totp_enabled = any(col['name'] == 'totp_enabled' for col in columns)
has_totp_grace = any(col['name'] == 'totp_grace_period_days' for col in columns)

print(f"\nhas_totp_enabled: {has_totp_enabled}")
print(f"has_totp_grace_period_days: {has_totp_grace}")

# Now try to add the columns if they don't exist
conn = sqlite3.connect('app.db')
cursor = conn.cursor()

if not has_totp_enabled:
    print("\nAdding totp_enabled column...")
    try:
        cursor.execute("ALTER TABLE global_settings ADD COLUMN totp_enabled BOOLEAN DEFAULT 0 NOT NULL")
        conn.commit()
        print("Added totp_enabled")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()

if not has_totp_grace:
    print("\nAdding totp_grace_period_days column...")
    try:
        cursor.execute("ALTER TABLE global_settings ADD COLUMN totp_grace_period_days INTEGER DEFAULT 7 NOT NULL")
        conn.commit()
        print("Added totp_grace_period_days")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()

conn.close()

# Verify
inspector = inspect(engine)
columns = inspector.get_columns('global_settings')
print("\nFinal columns in global_settings:")
for col in columns:
    print(f"  {col['name']} - {col['type']}")
