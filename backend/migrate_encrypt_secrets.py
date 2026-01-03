"""
Migration Script: Encrypt Existing Secrets

This script encrypts all existing unencrypted OTP secrets and TOTP secrets in the database.
Run this AFTER deploying the encryption code to encrypt all existing secrets.

Usage:
    python migrate_encrypt_secrets.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app import models, secrets_encryption
from sqlalchemy.orm import Session

def migrate_application_secrets(db: Session) -> tuple[int, int]:
    """
    Encrypt all unencrypted OTP secrets in applications table.
    
    Returns:
        Tuple of (encrypted_count, skipped_count)
    """
    print("Migrating Application OTP secrets...")
    applications = db.query(models.Application).all()
    
    encrypted_count = 0
    skipped_count = 0
    errors = []
    
    for app in applications:
        try:
            # Check if secret is already encrypted
            if secrets_encryption.is_encrypted(app.secret):
                skipped_count += 1
                continue
            
            # Encrypt the secret
            encrypted_secret = secrets_encryption.encrypt_secret(app.secret)
            app.secret = encrypted_secret
            encrypted_count += 1
            print(f"  ✓ Encrypted application: {app.name} (ID: {app.id})")
            
        except Exception as e:
            errors.append(f"Application {app.id} ({app.name}): {str(e)}")
            print(f"  ✗ Error encrypting {app.name}: {str(e)}")
    
    # Commit all changes
    if encrypted_count > 0:
        db.commit()
        print(f"\n✓ Committed {encrypted_count} encrypted applications")
    
    return encrypted_count, skipped_count, errors


def migrate_user_totp_secrets(db: Session) -> tuple[int, int]:
    """
    Encrypt all unencrypted TOTP secrets in users table.
    
    Returns:
        Tuple of (encrypted_count, skipped_count)
    """
    print("\nMigrating User TOTP secrets...")
    users = db.query(models.User).filter(models.User.totp_enabled == True).all()
    
    encrypted_count = 0
    skipped_count = 0
    errors = []
    
    for user in users:
        try:
            if not user.totp_secret:
                skipped_count += 1
                continue
            
            # Check if secret is already encrypted
            if secrets_encryption.is_encrypted(user.totp_secret):
                skipped_count += 1
                continue
            
            # Encrypt the secret
            encrypted_secret = secrets_encryption.encrypt_secret(user.totp_secret)
            user.totp_secret = encrypted_secret
            encrypted_count += 1
            print(f"  ✓ Encrypted TOTP secret for user: {user.email} (ID: {user.id})")
            
        except Exception as e:
            errors.append(f"User {user.id} ({user.email}): {str(e)}")
            print(f"  ✗ Error encrypting TOTP for {user.email}: {str(e)}")
    
    # Commit all changes
    if encrypted_count > 0:
        db.commit()
        print(f"\n✓ Committed {encrypted_count} encrypted user TOTP secrets")
    
    return encrypted_count, skipped_count, errors


def main():
    """Run all migrations"""
    print("=" * 60)
    print("SECRET ENCRYPTION MIGRATION")
    print("=" * 60)
    print()
    
    # Note: Encryption key is auto-generated if not found
    print("ℹ️  Encryption key will be auto-generated if not found...")
    print("   (checked from ENCRYPTION_KEY env var, then .encryption_key file)")
    print()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Migrate application secrets
        app_encrypted, app_skipped, app_errors = migrate_application_secrets(db)
        
        # Migrate user TOTP secrets
        user_encrypted, user_skipped, user_errors = migrate_user_totp_secrets(db)
        
        # Print summary
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        print(f"\nApplications:")
        print(f"  Encrypted: {app_encrypted}")
        print(f"  Skipped:   {app_skipped}")
        
        print(f"\nUsers (TOTP):")
        print(f"  Encrypted: {user_encrypted}")
        print(f"  Skipped:   {user_skipped}")
        
        total_encrypted = app_encrypted + user_encrypted
        total_skipped = app_skipped + user_skipped
        
        print(f"\nTotal:")
        print(f"  Encrypted: {total_encrypted}")
        print(f"  Skipped:   {total_skipped}")
        
        # Print any errors
        if app_errors or user_errors:
            print(f"\n⚠️  ERRORS ENCOUNTERED:")
            for error in app_errors + user_errors:
                print(f"  - {error}")
        
        if total_encrypted > 0:
            print(f"\n✅ Successfully encrypted {total_encrypted} secrets!")
        else:
            print(f"\n✅ No unencrypted secrets found (already encrypted or none exist)")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ MIGRATION FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
