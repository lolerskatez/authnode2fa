import sqlite3
import os

db_path = 'authy.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add the missing column to oidc_config table
        cursor.execute("ALTER TABLE oidc_config ADD COLUMN post_logout_redirect_uri VARCHAR")
        conn.commit()
        print("✓ Successfully added post_logout_redirect_uri column to oidc_config table")
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print("✓ Column post_logout_redirect_uri already exists")
        else:
            print(f"✗ Error: {e}")
    
    try:
        # Add signup_enabled column to global_settings table
        cursor.execute("ALTER TABLE global_settings ADD COLUMN signup_enabled BOOLEAN DEFAULT 1")
        conn.commit()
        print("✓ Successfully added signup_enabled column to global_settings table")
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print("✓ Column signup_enabled already exists")
        else:
            print(f"✗ Error: {e}")
    finally:
        conn.close()
else:
    print("✗ Database file not found at", db_path)

