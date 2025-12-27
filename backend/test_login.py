#!/usr/bin/env python
"""Test login functionality"""

from app.database import SessionLocal
from app.models import User
from app import auth, crud

db = SessionLocal()

# Check existing user
user = db.query(User).filter(User.email == 'test@example.com').first()
if user:
    print(f'✓ User found: {user.email} (username: {user.username})')
    print(f'✓ Password hash: {user.password_hash[:50]}...')
    
    # Test password verification
    test_pwd = 'password123'
    is_valid = auth.verify_password(test_pwd, user.password_hash)
    print(f'✓ Password verification for "{test_pwd}": {is_valid}')
    
    # Test authenticate_user function
    authenticated = crud.authenticate_user(db, 'test@example.com', 'password123')
    if authenticated:
        print(f'✓ Authentication successful for test@example.com')
    else:
        print(f'✗ Authentication failed for test@example.com')
else:
    print('✗ User not found')
