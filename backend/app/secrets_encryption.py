"""
Secrets Encryption Module

Handles secure encryption and decryption of OTP secrets and other sensitive data.
Uses Fernet (symmetric encryption) with a dedicated encryption key for secrets.

This ensures that TOTP/HOTP secrets are never stored in plain text in the database,
protecting against database breaches and complete system compromise.

Key Rotation Strategy:
- ENCRYPTION_KEY: Primary encryption key for all secrets
- Keep keys secure in environment variables or secure key management service
"""

import os
from cryptography.fernet import Fernet, InvalidToken
import base64
from typing import Optional


def get_encryption_key() -> str:
    """
    Retrieve or auto-generate the encryption key.
    
    Priority order:
    1. ENCRYPTION_KEY environment variable
    2. .encryption_key file in backend directory
    3. Auto-generate and save to .encryption_key file (fresh install)
    
    This allows automatic key generation on fresh installs for both
    bare metal and Docker deployments.
    
    Returns:
        Base64-encoded encryption key
        
    Raises:
        ValueError: If encryption key is invalid
    """
    # Try environment variable first (for Docker secrets/config)
    key = os.getenv("ENCRYPTION_KEY")
    if key:
        try:
            # Validate it's a valid Fernet key
            Fernet(key.encode())
            return key
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY environment variable: {str(e)}")
    
    # Try loading from .encryption_key file
    # Check multiple locations for Docker and bare metal compatibility
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Docker persistent volume location (preferred for Docker deployments)
    docker_key_file = "/app/encryption_data/.encryption_key"
    # Local key file (for bare metal/dev)
    local_key_file = os.path.join(backend_dir, ".encryption_key")
    
    # Try Docker location first, then local
    for key_file in [docker_key_file, local_key_file]:
        if os.path.exists(key_file):
            try:
                with open(key_file, "r") as f:
                    key = f.read().strip()
                
                # Validate it's a valid Fernet key
                Fernet(key.encode())
                return key
            except Exception as e:
                print(f"Warning: Failed to load encryption key from {key_file}: {str(e)}")
                continue
    
    # Auto-generate key on fresh install
    # Prefer Docker volume location if it exists
    if os.path.isdir("/app/encryption_data"):
        key_file = docker_key_file
    else:
        key_file = local_key_file
    
    # Auto-generate key on fresh install
    try:
        new_key = Fernet.generate_key().decode()
        
        # Save to file for persistence across restarts
        os.makedirs(os.path.dirname(key_file), exist_ok=True)
        with open(key_file, "w") as f:
            f.write(new_key)
        
        # Set restrictive permissions on the key file (Unix-like systems)
        try:
            os.chmod(key_file, 0o600)  # Read/write only for owner
        except (AttributeError, OSError):
            # Windows doesn't support chmod the same way
            pass
        
        print(f"✓ Auto-generated encryption key and saved to {key_file}")
        print("  Keep this file secure and back it up!")
        
        return new_key
    except Exception as e:
        raise ValueError(f"Failed to generate encryption key: {str(e)}")


def encrypt_secret(secret: str) -> str:
    """
    Encrypt a secret (OTP key, password, etc.) for secure storage.
    
    Args:
        secret: The plain text secret to encrypt
        
    Returns:
        Encrypted secret string (Fernet token)
        
    Raises:
        ValueError: If encryption key is not configured
    """
    if not secret:
        return ""
    
    try:
        key = get_encryption_key()
        cipher = Fernet(key)
        encrypted = cipher.encrypt(secret.encode())
        return encrypted.decode()
    except Exception as e:
        raise ValueError(f"Failed to encrypt secret: {str(e)}")


def decrypt_secret(encrypted_secret: str) -> str:
    """
    Decrypt a secret that was encrypted with encrypt_secret.
    
    Args:
        encrypted_secret: The encrypted secret string
        
    Returns:
        Decrypted plain text secret
        
    Raises:
        ValueError: If decryption fails (wrong key or corrupted data)
    """
    if not encrypted_secret:
        return ""
    
    try:
        key = get_encryption_key()
        cipher = Fernet(key)
        decrypted = cipher.decrypt(encrypted_secret.encode())
        return decrypted.decode()
    except InvalidToken:
        raise ValueError(
            "Failed to decrypt secret. This usually means the ENCRYPTION_KEY has changed. "
            "If you changed the key, you need to migrate your encrypted secrets."
        )
    except Exception as e:
        raise ValueError(f"Failed to decrypt secret: {str(e)}")


def is_encrypted(value: str) -> bool:
    """
    Check if a value is encrypted (basic check).
    
    Encrypted Fernet tokens start with "gAAAAAB"
    
    Args:
        value: The value to check
        
    Returns:
        True if value appears to be a Fernet encrypted token, False otherwise
    """
    if not value:
        return False
    return value.startswith("gAAAAAB")


def encrypt_if_needed(secret: str) -> str:
    """
    Encrypt a secret only if it's not already encrypted.
    Useful for ensuring backward compatibility.
    
    Args:
        secret: The secret to potentially encrypt
        
    Returns:
        Encrypted secret
    """
    if is_encrypted(secret):
        return secret
    return encrypt_secret(secret)


def rotate_encryption_key(old_secrets: list[str], new_key: str) -> list[str]:
    """
    Rotate encryption key for a list of secrets.
    
    This is used during key rotation to re-encrypt all secrets with the new key.
    
    Args:
        old_secrets: List of secrets encrypted with old key
        new_key: New encryption key (base64-encoded)
        
    Returns:
        List of secrets encrypted with new key
    """
    rotated = []
    for secret in old_secrets:
        try:
            # Decrypt with current key
            decrypted = decrypt_secret(secret)
            # Re-encrypt with new key (by temporarily setting ENCRYPTION_KEY)
            old_key = os.getenv("ENCRYPTION_KEY")
            os.environ["ENCRYPTION_KEY"] = new_key
            encrypted = encrypt_secret(decrypted)
            if old_key:
                os.environ["ENCRYPTION_KEY"] = old_key
            rotated.append(encrypted)
        except Exception as e:
            print(f"Warning: Could not rotate secret: {str(e)}")
            rotated.append(secret)  # Keep original if rotation fails
    return rotated
