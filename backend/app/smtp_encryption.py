"""
SMTP Encryption Module

Handles secure encryption and decryption of SMTP credentials.
Uses Fernet (symmetric encryption) with a dedicated encryption key for SMTP secrets.

This ensures that SMTP passwords are never stored in plain text in the database,
protecting against database breaches and credential theft.
"""

import os
from cryptography.fernet import Fernet, InvalidToken
import base64


# Get or generate SMTP encryption key
def get_smtp_encryption_key() -> str:
    """
    Get the SMTP encryption key from environment variables.
    Falls back to the general ENCRYPTION_KEY if SMTP_ENCRYPTION_KEY is not set.
    
    Returns:
        Base64-encoded encryption key
    """
    smtp_key = os.getenv("SMTP_ENCRYPTION_KEY")
    if smtp_key:
        return smtp_key
    
    # Fall back to main encryption key if available
    return os.getenv("ENCRYPTION_KEY", "")


def encrypt_smtp_password(password: str) -> str:
    """
    Encrypt SMTP password for secure storage.
    
    Args:
        password: The plain text SMTP password
    
    Returns:
        Encrypted password string (Fernet token)
    
    Raises:
        ValueError: If encryption key is not configured
    """
    if not password:
        return ""
    
    key = get_smtp_encryption_key()
    if not key:
        raise ValueError("SMTP encryption key not configured. Set ENCRYPTION_KEY or SMTP_ENCRYPTION_KEY environment variable.")
    
    try:
        # Ensure the key is properly formatted
        if not isinstance(key, bytes):
            # Try to decode if it's a string representation of bytes
            try:
                key = key.encode() if isinstance(key, str) else key
            except:
                pass
        
        cipher = Fernet(key)
        encrypted = cipher.encrypt(password.encode())
        return encrypted.decode()
    except Exception as e:
        raise ValueError(f"Failed to encrypt SMTP password: {str(e)}")


def decrypt_smtp_password(encrypted_password: str) -> str:
    """
    Decrypt SMTP password for use.
    
    Args:
        encrypted_password: The encrypted password string
    
    Returns:
        Decrypted plain text password
    
    Raises:
        ValueError: If decryption fails
    """
    if not encrypted_password:
        return ""
    
    key = get_smtp_encryption_key()
    if not key:
        raise ValueError("SMTP encryption key not configured. Set ENCRYPTION_KEY or SMTP_ENCRYPTION_KEY environment variable.")
    
    try:
        if not isinstance(key, bytes):
            key = key.encode() if isinstance(key, str) else key
        
        cipher = Fernet(key)
        decrypted = cipher.decrypt(encrypted_password.encode())
        return decrypted.decode()
    except InvalidToken:
        raise ValueError("Failed to decrypt SMTP password: invalid token or corrupted data")
    except Exception as e:
        raise ValueError(f"Failed to decrypt SMTP password: {str(e)}")


def is_encrypted(value: str) -> bool:
    """
    Check if a value is encrypted (is a valid Fernet token).
    
    Args:
        value: The value to check
    
    Returns:
        True if the value appears to be a Fernet token, False otherwise
    """
    if not value:
        return False
    
    try:
        # Fernet tokens are base64-encoded and have a specific format
        # They start with 'gAAAAAB' in base64
        return value.startswith('gAAAAAB')
    except:
        return False


def ensure_encrypted(value: str, field_name: str = "password") -> str:
    """
    Ensure a value is encrypted. If it's plain text, encrypt it.
    Used during migrations to encrypt plain text values.
    
    Args:
        value: The value to check and potentially encrypt
        field_name: Name of the field (for error messages)
    
    Returns:
        Encrypted value
    """
    if not value:
        return value
    
    if is_encrypted(value):
        return value
    
    # Value is plain text, encrypt it
    return encrypt_smtp_password(value)
