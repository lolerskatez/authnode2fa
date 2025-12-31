"""
API Key Management System

Allows admins to create and manage API keys for third-party integrations.
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from . import models


class APIKeyManager:
    """Manages API key generation, validation, and tracking"""
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate a secure random API key"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash API key for secure storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    @staticmethod
    def create_api_key(db: Session, user_id: int, name: str, 
                      expires_in_days: Optional[int] = None,
                      scopes: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create a new API key"""
        api_key = APIKeyManager.generate_api_key()
        api_key_hash = APIKeyManager.hash_api_key(api_key)
        
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        db_key = models.APIKey(
            user_id=user_id,
            name=name,
            key_hash=api_key_hash,
            scopes=scopes or ["read:applications", "read:activity"],
            expires_at=expires_at,
            last_used_at=None,
            revoked=False
        )
        
        db.add(db_key)
        db.commit()
        db.refresh(db_key)
        
        return {
            "id": db_key.id,
            "name": db_key.name,
            "api_key": api_key,  # Only shown once at creation
            "scopes": db_key.scopes,
            "expires_at": db_key.expires_at.isoformat() if db_key.expires_at else None,
            "created_at": db_key.created_at.isoformat(),
            "message": "⚠️ Save this API key securely. You won't be able to see it again!"
        }
    
    @staticmethod
    def validate_api_key(db: Session, api_key: str) -> Optional[models.APIKey]:
        """Validate API key and return the key record if valid"""
        api_key_hash = APIKeyManager.hash_api_key(api_key)
        
        db_key = db.query(models.APIKey).filter(
            models.APIKey.key_hash == api_key_hash,
            models.APIKey.revoked == False
        ).first()
        
        if not db_key:
            return None
        
        # Check if expired
        if db_key.expires_at and db_key.expires_at < datetime.utcnow():
            return None
        
        # Update last used
        db_key.last_used_at = datetime.utcnow()
        db.commit()
        
        return db_key
    
    @staticmethod
    def get_api_keys(db: Session, user_id: int) -> List[models.APIKey]:
        """Get all API keys for user"""
        return db.query(models.APIKey).filter(
            models.APIKey.user_id == user_id
        ).order_by(models.APIKey.created_at.desc()).all()
    
    @staticmethod
    def revoke_api_key(db: Session, key_id: int, user_id: int) -> bool:
        """Revoke an API key"""
        db_key = db.query(models.APIKey).filter(
            models.APIKey.id == key_id,
            models.APIKey.user_id == user_id
        ).first()
        
        if not db_key:
            return False
        
        db_key.revoked = True
        db_key.revoked_at = datetime.utcnow()
        db.commit()
        return True
    
    @staticmethod
    def delete_api_key(db: Session, key_id: int, user_id: int) -> bool:
        """Delete an API key"""
        db_key = db.query(models.APIKey).filter(
            models.APIKey.id == key_id,
            models.APIKey.user_id == user_id
        ).first()
        
        if not db_key:
            return False
        
        db.delete(db_key)
        db.commit()
        return True
