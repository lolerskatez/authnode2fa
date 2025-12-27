#!/usr/bin/env python
"""Script to create a test user for local testing"""

from app.database import SessionLocal
from app import models, schemas, crud
from sqlalchemy import create_engine

# Create tables
from app.database import engine, Base
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    # Check if test user already exists
    existing_user = crud.get_user_by_email(db, 'test@example.com')
    
    if existing_user:
        print(f'✓ Test user already exists: {existing_user.email}')
    else:
        # Create test user
        user_create = schemas.UserCreate(
            email='test@example.com',
            username='testuser',
            password='password123',
            name='Test User'
        )
        db_user = crud.create_user(db, user_create)
        db.commit()
        print(f'✓ Created test user: {db_user.email}')
        print(f'  Password: password123')
        print(f'  Name: {db_user.name}')
        
finally:
    db.close()
