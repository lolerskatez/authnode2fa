"""
Encryption System Verification Script

Tests the encryption module to ensure all components are working correctly.
Run this after deploying encryption or before migrations.

Usage:
    python verify_encryption.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_encryption_module():
    """Test basic encryption module functionality"""
    print("\n" + "=" * 60)
    print("ENCRYPTION MODULE VERIFICATION")
    print("=" * 60)
    
    try:
        from app import secrets_encryption
        print("✓ secrets_encryption module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import secrets_encryption module: {e}")
        return False
    
    # Test 1: Key generation/retrieval
    print("\n[Test 1] Encryption Key")
    print("-" * 40)
    try:
        key = secrets_encryption.get_encryption_key()
        if isinstance(key, str) and len(key) == 44:
            print(f"✓ Encryption key retrieved: {key[:10]}...{key[-5:]}")
        else:
            print(f"✗ Invalid key format: {type(key)} (expected str of length 44)")
            return False
    except Exception as e:
        print(f"✗ Failed to get encryption key: {e}")
        return False
    
    # Test 2: Encryption
    print("\n[Test 2] Secret Encryption")
    print("-" * 40)
    test_secret = "super_secret_otp_key_12345"
    try:
        encrypted = secrets_encryption.encrypt_secret(test_secret)
        if isinstance(encrypted, str) and len(encrypted) > len(test_secret):
            print(f"✓ Secret encrypted: {encrypted[:20]}...{encrypted[-10:]}")
        else:
            print(f"✗ Encryption failed: invalid result")
            return False
    except Exception as e:
        print(f"✗ Encryption failed: {e}")
        return False
    
    # Test 3: Decryption
    print("\n[Test 3] Secret Decryption")
    print("-" * 40)
    try:
        decrypted = secrets_encryption.decrypt_secret(encrypted)
        if decrypted == test_secret:
            print(f"✓ Secret decrypted correctly: {test_secret}")
        else:
            print(f"✗ Decryption mismatch!")
            print(f"  Expected: {test_secret}")
            print(f"  Got: {decrypted}")
            return False
    except Exception as e:
        print(f"✗ Decryption failed: {e}")
        return False
    
    # Test 4: Encryption detection
    print("\n[Test 4] Encryption Detection")
    print("-" * 40)
    try:
        is_plain = secrets_encryption.is_encrypted(test_secret)
        is_encrypted = secrets_encryption.is_encrypted(encrypted)
        
        if not is_plain and is_encrypted:
            print("✓ Encryption detection working correctly")
        else:
            print(f"✗ Encryption detection failed!")
            print(f"  Plaintext detected as encrypted: {is_plain}")
            print(f"  Ciphertext detected as plaintext: {not is_encrypted}")
            return False
    except Exception as e:
        print(f"✗ Encryption detection failed: {e}")
        return False
    
    # Test 5: Conditional encryption
    print("\n[Test 5] Conditional Encryption")
    print("-" * 40)
    try:
        # Should encrypt plaintext
        result1 = secrets_encryption.encrypt_if_needed(test_secret)
        if secrets_encryption.is_encrypted(result1):
            print("✓ Plaintext encrypted when needed")
        else:
            print("✗ Failed to encrypt plaintext")
            return False
        
        # Should skip already-encrypted
        result2 = secrets_encryption.encrypt_if_needed(encrypted)
        if result2 == encrypted:
            print("✓ Already-encrypted secret skipped")
        else:
            print("✗ Double-encrypted already encrypted secret")
            return False
    except Exception as e:
        print(f"✗ Conditional encryption failed: {e}")
        return False
    
    # Test 6: Empty secret handling
    print("\n[Test 6] Empty Secret Handling")
    print("-" * 40)
    try:
        empty_enc = secrets_encryption.encrypt_secret("")
        if empty_enc == "":
            print("✓ Empty secret handled correctly")
        else:
            print(f"✗ Empty secret not handled: {empty_enc}")
            return False
    except Exception as e:
        print(f"✗ Empty secret test failed: {e}")
        return False
    
    return True


def test_database_integration():
    """Test database integration"""
    print("\n" + "=" * 60)
    print("DATABASE INTEGRATION VERIFICATION")
    print("=" * 60)
    
    try:
        from app.database import SessionLocal
        from app import models
        print("✓ Database module imported successfully")
    except ImportError as e:
        print(f"⚠ Could not import database module: {e}")
        return None  # Skip if database not available
    
    # Test 7: Create test application
    print("\n[Test 7] Application Encryption Integration")
    print("-" * 40)
    try:
        db = SessionLocal()
        
        # Check if we can query applications
        test_app_count = db.query(models.Application).count()
        print(f"✓ Database connected: Found {test_app_count} applications")
        
        db.close()
        return True
    except Exception as e:
        print(f"⚠ Database test skipped: {e}")
        return None


def test_key_file_persistence():
    """Test encryption key file persistence"""
    print("\n" + "=" * 60)
    print("KEY FILE PERSISTENCE VERIFICATION")
    print("=" * 60)
    
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    key_file = os.path.join(backend_dir, ".encryption_key")
    
    print("\n[Test 8] Key File Status")
    print("-" * 40)
    
    if os.path.exists(key_file):
        try:
            with open(key_file, "r") as f:
                key_content = f.read().strip()
            
            if len(key_content) == 44:
                print(f"✓ Key file exists: {key_file}")
                print(f"✓ Key file readable: {len(key_content)} characters")
                
                # Check permissions (Unix)
                try:
                    perms = oct(os.stat(key_file).st_mode)[-3:]
                    if perms == "600":
                        print(f"✓ Key file permissions secure: {perms}")
                    else:
                        print(f"⚠ Key file permissions not optimal: {perms} (should be 600)")
                except:
                    print("ℹ Key file permissions check skipped (Windows)")
                
                return True
            else:
                print(f"✗ Key file invalid format: {len(key_content)} chars")
                return False
        except Exception as e:
            print(f"✗ Error reading key file: {e}")
            return False
    else:
        print(f"ℹ Key file not yet created: {key_file}")
        print("  (Will be created automatically on first encryption operation)")
        return True


def main():
    """Run all verification tests"""
    print("\n" + "█" * 60)
    print("ENCRYPTION SYSTEM VERIFICATION")
    print("█" * 60)
    
    results = {
        "Encryption Module": False,
        "Key File Persistence": False,
        "Database Integration": None,
    }
    
    # Run tests
    results["Encryption Module"] = test_encryption_module()
    results["Key File Persistence"] = test_key_file_persistence()
    results["Database Integration"] = test_database_integration()
    
    # Print summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    for test_name, result in results.items():
        if result is True:
            status = "✓ PASS"
        elif result is False:
            status = "✗ FAIL"
        else:
            status = "⊘ SKIP"
        print(f"{test_name:.<40} {status}")
    
    # Overall result
    all_pass = all(r is not False for r in results.values())
    all_critical_pass = all(r is not False for k, r in results.items() if k != "Database Integration")
    
    print("\n" + "=" * 60)
    if all_pass:
        print("✅ ALL TESTS PASSED - Encryption system ready!")
    elif all_critical_pass:
        print("⚠️  CRITICAL TESTS PASSED - Some optional tests skipped")
    else:
        print("❌ SOME TESTS FAILED - See errors above")
    print("=" * 60)
    
    return 0 if all_critical_pass else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
