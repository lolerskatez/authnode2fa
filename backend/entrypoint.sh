#!/bin/bash
# Docker entrypoint script for 2FA Manager backend
# Handles database migrations and starts the application

set -e

echo "Starting 2FA Manager Backend..."

# Check if database connection is available (wait for PostgreSQL to be ready)
if [ ! -z "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "Waiting for PostgreSQL to be ready..."
    while ! python -c "from sqlalchemy import create_engine; create_engine('$DATABASE_URL').execute('SELECT 1')" 2>/dev/null; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 1
    done
    echo "PostgreSQL is ready!"
fi

# Run database migrations
echo "Running database migrations..."
python -m alembic upgrade head

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
