# Encryption Setup Guide

## Overview

AuthNode 2FA automatically handles encryption key management for both **bare metal** and **Docker** installations. No manual key generation is required for fresh installs.

## How It Works

The encryption system follows this priority order:

1. **Environment Variable** (`ENCRYPTION_KEY`) - For Docker secrets and production deployments
2. **.encryption_key File** - Persisted in `backend/.encryption_key` for both bare metal and Docker
3. **Auto-generation** - If neither exists, a new key is generated and saved automatically

## Fresh Install (No Manual Setup Required)

### Bare Metal Installation

```bash
cd backend
python run_server.py
```

On first run:
- ✅ Encryption key is auto-generated
- ✅ Saved to `backend/.encryption_key`
- ✅ All secrets encrypted automatically

The `.encryption_key` file:
- **NEVER** committed to version control (in `.gitignore`)
- **MUST** be backed up securely
- Should have restrictive file permissions (600)

### Docker Installation

```bash
docker-compose up
```

On first run:
- ✅ Encryption key is auto-generated
- ✅ Saved to `backend/.encryption_key`
- ✅ Persisted via volume mount

The `backend` directory is mounted as a volume to persist the key across container restarts.

## Production Deployment

For production, you have two options:

### Option 1: Use Environment Variable (Recommended)

Set the `ENCRYPTION_KEY` before deployment:

```bash
# Generate a key once
export ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Use in your deployment
docker-compose -f docker-compose.prod.yml up
```

**In your `.env` file:**
```env
ENCRYPTION_KEY=<your-generated-key>
```

### Option 2: File-Based (Persistent Storage)

The key will be auto-generated and saved to `backend/.encryption_key` if no environment variable is set.

**Requirements:**
- `backend/` directory must be mounted as a volume
- Key file must be backed up
- Key file must be readable by the container

## Migration from Plaintext Secrets

If upgrading from an older version with plaintext secrets:

```bash
# Run migration script
cd backend
python migrate_encrypt_secrets.py
```

This will:
- Detect all plaintext OTP secrets
- Encrypt them automatically
- Skip already-encrypted secrets
- Provide a detailed migration report

## Backup & Recovery

### Backing Up the Encryption Key

**For bare metal:**
```bash
# Copy the key to a secure location
cp backend/.encryption_key /secure/backup/location/
```

**For Docker:**
```bash
# Extract from volume
docker cp <container_id>:/app/backend/.encryption_key /secure/backup/location/
```

### Rotating the Encryption Key

If you need to rotate the key (security best practice):

```bash
# 1. Backup current key
cp backend/.encryption_key backend/.encryption_key.backup

# 2. Generate new key
export NEW_ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# 3. Run rotation script (coming soon)
python backend/rotate_encryption_key.py

# 4. Update environment if using ENV variable
export ENCRYPTION_KEY=$NEW_ENCRYPTION_KEY
```

## Security Considerations

### Key Management

- ✅ Keys are automatically generated using cryptography.fernet.Fernet
- ✅ Keys are persisted in a dedicated `.encryption_key` file
- ✅ File permissions are set to 600 (owner read/write only)
- ✅ Keys are NEVER committed to version control

### What's Encrypted

- ✅ TOTP/HOTP secrets (user 2FA)
- ✅ Application OAuth/API secrets
- ✅ SMTP passwords

### What's NOT (Yet) Encrypted

- ⏳ Backup codes (in development)
- ⏳ JSON field settings (in development)
- ⏳ Database-level encryption at rest (infrastructure setup)

## Troubleshooting

### "ENCRYPTION_KEY environment variable is not set"

**For fresh install:** This is normal. The key will auto-generate.

**For existing install:** 
- Check that `backend/.encryption_key` exists
- Verify file permissions are readable
- Check disk space for file creation

### "Invalid ENCRYPTION_KEY format"

The key must be a valid Fernet key (44 characters, base64-encoded).

**Fix:**
```bash
# Generate a new key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Set in environment or backend/.encryption_key file
export ENCRYPTION_KEY=<generated_key>
```

### Lost the Encryption Key

If you lose the encryption key and don't have a backup:

1. **All encrypted secrets become unrecoverable**
2. Users must re-add their TOTP/OAuth apps
3. New encryption key will be generated on next start

**Prevention:** Always back up `backend/.encryption_key`

## Environment Variables Reference

```bash
# Optional: Set encryption key explicitly
ENCRYPTION_KEY=<base64-encoded-fernet-key>

# If not set, key is auto-generated and saved to backend/.encryption_key
```

## Docker Volume Mounts

### docker-compose.yml (Development)
```yaml
backend:
  volumes:
    - ./backend:/app/backend  # Persists .encryption_key
```

### docker-compose.prod.yml (Production)
```yaml
backend:
  volumes:
    - ./logs:/app/logs
    - ./backend:/app/backend:ro  # Read-only, persists .encryption_key
```

## Next Steps

1. ✅ **Fresh Install** - Just start the app, encryption happens automatically
2. ⏳ **Upgrade** - Run `migrate_encrypt_secrets.py` to encrypt existing secrets
3. 🔐 **Production** - Set `ENCRYPTION_KEY` in environment for security
4. 💾 **Backup** - Regularly back up `backend/.encryption_key` file

---

**Last Updated:** January 2026  
**Encryption Method:** Fernet (symmetric, cryptography library)  
**Key Length:** 256-bit (cryptographically secure)
