#!/usr/bin/env python
"""Check existing users and create test user if needed"""

import sys
import os

# Set up path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app import models, schemas, crud, auth

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

try:
    # Check for existing users
    users = db.query(models.User).all()
    print(f"\n=== User Database Status ===")
    print(f"Total users in database: {len(users)}")
    
    if users:
        print("\nExisting users:")
        for u in users:
            print(f"  - Email: {u.email}")
            print(f"    Username: {u.username}")
            print(f"    Name: {u.name}")
            print(f"    Role: {u.role}")
            print(f"    Has password: {bool(u.password_hash)}")
            print()
    
    # Check for test user
    test_user = crud.get_user_by_email(db, 'test@example.com')
    
    if test_user:
        print("✓ Test user already exists")
        print(f"  Email: {test_user.email}")
        print(f"  Can login locally: {not test_user.is_sso_user}")
    else:
        print("\n⚠ Test user NOT found, creating...")
        user_create = schemas.UserCreate(
            email='test@example.com',
            username='testuser',
            password='password123',
            name='Test User'
        )
        new_user = crud.create_user(db, user_create)
        print("✓ Test user created successfully!")
        print(f"  Email: {new_user.email}")
        print(f"  Username: {new_user.username}")
        print(f"  Role: {new_user.role}")
        
finally:
    db.close()
    print("\n=== Ready to test login ===")
    print("Credentials: test@example.com / password123\n")
