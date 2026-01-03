#!/bin/bash
# Docker entrypoint script for 2FA Manager backend
# Handles database migrations and starts the application

set -e

echo "Starting 2FA Manager Backend..."

# Wait for PostgreSQL to be ready
if [ ! -z "$DATABASE_URL" ]; then
    echo "Waiting for PostgreSQL to be ready..."
    # Extract host and port from DATABASE_URL (format: postgresql://user:pass@host:port/db)
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    # Wait for port to be open
    until timeout 1 bash -c "cat < /dev/null > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 2
    done
    
    # Give it a moment to fully initialize
    sleep 2
    echo "PostgreSQL is ready!"
fi

# Run database migrations
echo "Running database migrations..."
# Merge any conflicting heads first
python -m alembic merge heads 2>/dev/null || true
# Now run migrations
python -m alembic upgrade head || {
    echo "Migration failed, attempting to create tables from models..."
    python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
}

# Create default admin user if it doesn't exist
echo "Checking for default admin user..."
python -c "
from app.database import SessionLocal
from app import models, schemas, crud

db = SessionLocal()
try:
    admin_user = crud.get_user_by_email(db, 'admin@example.com')
    if not admin_user:
        print('Creating default admin user...')
        user_create = schemas.UserCreate(
            email='admin@example.com',
            username='admin',
            password='changeme123',
            name='Administrator'
        )
        db_user = crud.create_user(db, user_create)
        # Set admin role if the model supports it
        if hasattr(db_user, 'role'):
            db_user.role = 'admin'
            db.commit()
        print(f'Default admin created: admin@example.com (change password immediately!)')
    else:
        print('Admin user already exists')
finally:
    db.close()
"

# Start the application
echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8041
