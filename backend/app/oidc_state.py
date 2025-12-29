"""
OIDC State Management Module

Handles secure state generation, storage, and validation for OIDC OAuth2 flows.
The state parameter is critical for CSRF protection in OAuth2 authorization flows.

State lifecycle:
1. Generated during OIDC login initiation
2. Stored in database with expiration and nonce
3. Validated during callback to prevent CSRF attacks
4. Deleted after validation
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, delete
from sqlalchemy.orm import Session
from . import models


def generate_secure_state(length: int = 32) -> str:
    """
    Generate a cryptographically secure random state token.
    
    Args:
        length: Length of the state token (default 32 bytes)
    
    Returns:
        Hex-encoded random state token
    """
    return secrets.token_hex(length)


def hash_state(state: str) -> str:
    """
    Hash the state for secure storage.
    
    Args:
        state: The raw state token
    
    Returns:
        SHA256 hash of the state
    """
    return hashlib.sha256(state.encode()).hexdigest()


def store_oidc_state(db: Session, state: str, nonce: str = None, expiration_minutes: int = 15) -> str:
    """
    Store an OIDC state token in the database.
    
    Args:
        db: Database session
        state: The state token to store
        nonce: Optional nonce for additional security
        expiration_minutes: How long the state is valid (default 15 minutes)
    
    Returns:
        The state token
    """
    # Hash the state for storage (don't store the raw state)
    hashed_state = hash_state(state)
    
    # Create OIDC state record
    oidc_state = models.OIDCState(
        state_hash=hashed_state,
        nonce=nonce,
        expires_at=datetime.utcnow() + timedelta(minutes=expiration_minutes),
        created_at=datetime.utcnow()
    )
    
    db.add(oidc_state)
    db.commit()
    
    return state


def validate_oidc_state(db: Session, state: str, delete_after_validation: bool = True) -> bool:
    """
    Validate an OIDC state token.
    
    Args:
        db: Database session
        state: The state token to validate
        delete_after_validation: Whether to delete the state after validation
    
    Returns:
        True if state is valid and not expired, False otherwise
    """
    if not state:
        return False
    
    # Hash the received state
    hashed_state = hash_state(state)
    
    # Look up the state in database
    oidc_state = db.query(models.OIDCState).filter(
        models.OIDCState.state_hash == hashed_state
    ).first()
    
    if not oidc_state:
        return False
    
    # Check if expired
    if datetime.utcnow() > oidc_state.expires_at:
        # Delete expired state
        db.query(models.OIDCState).filter(
            models.OIDCState.id == oidc_state.id
        ).delete()
        db.commit()
        return False
    
    # Valid state found
    if delete_after_validation:
        # Delete the state so it can't be reused
        db.query(models.OIDCState).filter(
            models.OIDCState.id == oidc_state.id
        ).delete()
        db.commit()
    
    return True


def cleanup_expired_states(db: Session) -> int:
    """
    Clean up expired OIDC state tokens from the database.
    This should be run periodically (e.g., via a background task).
    
    Args:
        db: Database session
    
    Returns:
        Number of deleted records
    """
    deleted = db.query(models.OIDCState).filter(
        models.OIDCState.expires_at < datetime.utcnow()
    ).delete()
    db.commit()
    return deleted


def get_nonce_from_state(db: Session, state: str) -> str:
    """
    Retrieve the nonce associated with a state token.
    
    Args:
        db: Database session
        state: The state token
    
    Returns:
        The nonce string, or None if not found
    """
    hashed_state = hash_state(state)
    oidc_state = db.query(models.OIDCState).filter(
        models.OIDCState.state_hash == hashed_state
    ).first()
    
    return oidc_state.nonce if oidc_state else None
