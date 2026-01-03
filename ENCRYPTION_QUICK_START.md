# Quick Setup Guide - Encryption Auto-Generation

## TL;DR

**Your encryption key is automatically generated and managed. No manual setup required!**

## Installation Paths

### 🐳 Docker (Recommended)

```bash
# 1. Setup
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# 2. Deploy (encryption key auto-generated)
docker-compose up
```

✅ **Done!** Encryption key is auto-generated and persisted in container volume.

---

### 💻 Bare Metal / Local Development

```bash
# 1. Setup Python environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start server (encryption key auto-generated)
python run_server.py
```

✅ **Done!** Encryption key is saved to `backend/.encryption_key` and persists automatically.

---

## Key Features

| Feature | Status | Details |
|---------|--------|---------|
| **Auto Key Generation** | ✅ | Happens on first run, no manual steps |
| **Persistent Key** | ✅ | Saved to `backend/.encryption_key` (never committed) |
| **Environment Override** | ✅ | Set `ENCRYPTION_KEY=<key>` to use custom key |
| **Docker Compatible** | ✅ | Volume mounts handle persistence automatically |
| **Bare Metal Compatible** | ✅ | File persists in project directory |

---

## What Gets Encrypted

When users add new accounts:
- ✅ OTP secrets (TOTP/HOTP)
- ✅ OAuth/API app secrets
- ✅ SMTP passwords

All encryption happens automatically - no configuration needed!

---

## Upgrading from Old Version?

If you're upgrading from a version that stored secrets in plaintext:

```bash
cd backend
python migrate_encrypt_secrets.py
```

This will:
- Find all unencrypted secrets
- Encrypt them automatically
- Skip already-encrypted ones
- Show you what was migrated

---

## Verify It's Working

```bash
cd backend
python verify_encryption.py
```

This runs comprehensive tests on:
- ✓ Key generation
- ✓ Encryption/decryption
- ✓ Database integration
- ✓ File persistence

---

## Production Deployment

For production, optionally set your own key:

```bash
# Generate a key once
export ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Use in deployment
docker-compose -f docker-compose.prod.yml up
```

Or let it auto-generate - your choice!

---

## Backup Your Key

**Important:** Back up `backend/.encryption_key` periodically:

```bash
# Bare metal
cp backend/.encryption_key ~/backup/authnode2fa_key_$(date +%Y%m%d).bak

# Docker
docker cp <container>:/app/backend/.encryption_key ~/backup/authnode2fa_key.bak
```

---

## Lost Your Key?

If you lose the key and don't have a backup:

⚠️ **All encrypted secrets become unrecoverable**

Users will need to:
1. Re-add their TOTP apps
2. Re-authenticate OAuth connections

**Prevention:** Always back up `backend/.encryption_key`!

---

## For More Information

- 📖 [ENCRYPTION_SETUP.md](../ENCRYPTION_SETUP.md) - Comprehensive guide
- 🔐 [SECURITY.md](../SECURITY.md) - Security best practices
- 🚀 [DEPLOYMENT.md](../DEPLOYMENT.md) - Production deployment

---

**Questions?** Check the full [ENCRYPTION_SETUP.md](../ENCRYPTION_SETUP.md) guide.
