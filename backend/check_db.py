import sqlite3

conn = sqlite3.connect('authy.db')
cursor = conn.cursor()

# Check tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table";')
tables = [row[0] for row in cursor.fetchall()]
print('Tables:', tables)

if 'users' in tables:
    cursor.execute('PRAGMA table_info(users)')
    columns = cursor.fetchall()
    print('Users table columns:', [col[1] for col in columns])

    # Check if is_sso_user column exists
    column_names = [col[1] for col in columns]
    if 'is_sso_user' not in column_names:
        print('Adding is_sso_user column...')
        cursor.execute('ALTER TABLE users ADD COLUMN is_sso_user BOOLEAN DEFAULT 0;')
        print('Column added successfully')
    else:
        print('is_sso_user column already exists')

    # Check if password_hash is nullable
    for col in columns:
        if col[1] == 'password_hash':
            print(f'password_hash nullable: {col[3] == 0}')  # 0 means nullable
            if col[3] != 0:  # Not nullable
                print('Making password_hash nullable...')
                # SQLite doesn't support dropping NOT NULL, need to recreate table
                print('Note: password_hash needs to be made nullable manually if needed')

# Check if oidc_config table exists
if 'oidc_config' not in tables:
    print('Creating oidc_config table...')
    cursor.execute('''
        CREATE TABLE oidc_config (
            id INTEGER PRIMARY KEY,
            enabled BOOLEAN DEFAULT 0,
            provider_name TEXT DEFAULT 'Custom OIDC Provider',
            client_id TEXT,
            client_secret TEXT,
            issuer_url TEXT,
            authorization_endpoint TEXT,
            token_endpoint TEXT,
            userinfo_endpoint TEXT,
            jwks_uri TEXT,
            logout_endpoint TEXT,
            redirect_uri TEXT,
            scope TEXT DEFAULT 'openid email profile',
            admin_groups TEXT DEFAULT '["administrators", "admins"]',
            user_groups TEXT DEFAULT '["users"]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    print('oidc_config table created')
else:
    print('oidc_config table already exists')

conn.commit()
conn.close()
print('Database check complete')