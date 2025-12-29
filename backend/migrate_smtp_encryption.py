"""
SMTP Encryption Migration Script

This script helps migrate existing SMTP configurations that have plain-text passwords
to use encrypted passwords. Run this after deploying the SMTP encryption update.

Usage:
    python migrate_smtp_encryption.py

The script will:
1. Find all SMTP configs with plain-text passwords
2. Encrypt them using the ENCRYPTION_KEY
3. Mark them as encrypted
4. Log the results
"""

import os
import sys
import logging
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.smtp_encryption import encrypt_smtp_password, is_encrypted

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def migrate_smtp_passwords():
    """
    Migrate plain-text SMTP passwords to encrypted format.
    """
    db = SessionLocal()
    
    try:
        # Get all SMTP configs
        smtp_configs = db.query(models.SMTPConfig).all()
        
        if not smtp_configs:
            logger.info("No SMTP configurations found in database.")
            return
        
        encrypted_count = 0
        already_encrypted = 0
        failed_count = 0
        
        for config in smtp_configs:
            if not config.password:
                logger.debug(f"SMTP config {config.id}: No password set, skipping")
                continue
            
            # Check if already encrypted
            if is_encrypted(config.password):
                logger.info(f"SMTP config {config.id}: Password already encrypted, skipping")
                already_encrypted += 1
                continue
            
            try:
                # Encrypt the plain-text password
                encrypted_password = encrypt_smtp_password(config.password)
                config.password = encrypted_password
                config.password_encrypted = True
                db.commit()
                
                logger.info(f"SMTP config {config.id}: Successfully encrypted password")
                encrypted_count += 1
                
            except Exception as e:
                db.rollback()
                logger.error(f"SMTP config {config.id}: Failed to encrypt password - {str(e)}")
                failed_count += 1
        
        # Summary
        logger.info("=" * 60)
        logger.info("SMTP Password Encryption Migration Summary")
        logger.info("=" * 60)
        logger.info(f"Total configurations: {len(smtp_configs)}")
        logger.info(f"Successfully encrypted: {encrypted_count}")
        logger.info(f"Already encrypted: {already_encrypted}")
        logger.info(f"Failed: {failed_count}")
        logger.info("=" * 60)
        
        if failed_count > 0:
            logger.warning("Some passwords failed to encrypt. Please check the logs above.")
            sys.exit(1)
        else:
            logger.info("Migration completed successfully!")
            sys.exit(0)
    
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Starting SMTP password encryption migration...")
    
    # Check if encryption key is set
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        logger.error("ENCRYPTION_KEY environment variable not set. Cannot encrypt passwords.")
        sys.exit(1)
    
    migrate_smtp_passwords()
