import sqlite3

conn = sqlite3.connect('app.db')
cursor = conn.cursor()

# Get current columns
cursor.execute("PRAGMA table_info(global_settings)")
columns = cursor.fetchall()
print("Current columns:")
for col in columns:
    print(f"  {col[1]} - {col[2]}")

# Check if totp_enabled exists
has_totp_enabled = any(col[1] == 'totp_enabled' for col in columns)
has_totp_grace = any(col[1] == 'totp_grace_period_days' for col in columns)

print(f"\nhas_totp_enabled: {has_totp_enabled}")
print(f"has_totp_grace_period_days: {has_totp_grace}")

if has_totp_enabled or has_totp_grace:
    # We need to drop these columns - but SQLite doesn't support DROP COLUMN easily
    # So we'll need to rebuild the table
    print("\nRemoving totp_enabled and totp_grace_period_days columns...")
    
    # Get all column definitions except the ones we want to remove
    keep_columns = [col for col in columns if col[1] not in ['totp_enabled', 'totp_grace_period_days']]
    column_names = [col[1] for col in keep_columns]
    
    # Create new table
    cursor.execute('''
        CREATE TABLE global_settings_new (
            id INTEGER PRIMARY KEY,
            login_page_theme VARCHAR,
            signup_enabled BOOLEAN,
            totp_enforcement VARCHAR,
            created_at DATETIME,
            updated_at DATETIME
        )
    ''')
    
    # Copy data
    cols_str = ', '.join(column_names)
    cursor.execute(f'INSERT INTO global_settings_new ({cols_str}) SELECT {cols_str} FROM global_settings')
    
    # Drop old table and rename new one
    cursor.execute('DROP TABLE global_settings')
    cursor.execute('ALTER TABLE global_settings_new RENAME TO global_settings')
    
    conn.commit()
    print("Columns removed successfully!")

conn.close()
