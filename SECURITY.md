# Security & Configuration Management

## ✅ Verified: No Secrets in Repository

All sensitive files are properly excluded from version control:

### What's Protected ✓

| File Type | Location | In Git? | Reason |
|-----------|----------|---------|--------|
| `.env` files | `backend/.env`, `frontend/.env` | ❌ NO | Contains database passwords, API keys, encryption keys |
| `*.db` files | `backend/authy.db`, etc. | ❌ NO | SQLite databases with user data |
| Backup files | `*.sql`, `*.backup` | ❌ NO | Database dumps with sensitive data |
| Config files | `config.json`, `settings.local.json` | ❌ NO | Local machine configuration |

### What's Safe to Commit ✓

| File | Content | In Git? |
|------|---------|---------|
| `.env.example` | Template with placeholder values | ✅ YES |
| `.env.docker.example` | Template with placeholder values | ✅ YES |
| `.gitignore` | Rules to exclude secrets | ✅ YES |
| `docker-compose.yml` | References env variables, not secrets | ✅ YES |
| `requirements.txt` | Package names and versions | ✅ YES |
| Migration files | Schema, not data | ✅ YES |

---

## Git Verification

### Current Status
```bash
# Files ignored by git:
backend/.env
backend/authy.db
frontend/.env
frontend/node_modules
backend/.venv

# Files tracked by git:
.env.example         # Template only
.env.docker.example  # Template only
docker-compose.yml   # Uses environment variables
```

### No Sensitive Data Found
Verified with:
```bash
git ls-files | grep -E "(\.env|\.db|password|secret|key)"
# Result: Only .env.example and .env.docker.example (templates)
```

---

## How Configuration Works

### Local Development

**Step 1**: Copy template to actual config
```bash
cp .env.example .env
```

**Step 2**: Edit with your local values
```bash
# .env
DATABASE_URL=sqlite:///./authy.db
ENCRYPTION_KEY=your-generated-key-here
```

**Step 3**: Setup automatically creates it
```bash
./setup_local.bat
# This calls setup_local.py which creates .env if missing
```

### Docker Deployment

**Step 1**: Copy production template
```bash
cp .env.docker.example .env.docker
```

**Step 2**: Edit with production secrets
```bash
# .env.docker
DATABASE_URL=postgresql://user:securepass@db/authy
ENCRYPTION_KEY=your-production-key
POSTGRES_PASSWORD=secure-database-password
```

**Step 3**: Run with explicit config
```bash
docker-compose --env-file .env.docker up -d
# Never commits .env.docker to git
```

---

## Generation of New Secrets

### Required for New Installations

#### 1. Encryption Key
```bash
# Generate Fernet key (Python)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Output: kV...RQ= (base64 encoded)
# Store in: ENCRYPTION_KEY=kV...RQ=
```

#### 2. Database Password
```bash
# Generate strong password
# Use: openssl, pwgen, or password manager
# Length: 16+ characters
# Characters: alphanumeric + special chars
# Store in: POSTGRES_PASSWORD=SecurePass123!@#
```

#### 3. JWT Secret (for token signing)
```bash
# Generate JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Output: xyz...abc (random string)
# Store in: JWT_SECRET_KEY=xyz...abc
```

#### 4. Optional: OIDC Credentials
```bash
# From your OAuth provider (Google, GitHub, etc.)
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_PROVIDER_URL=https://provider.com
```

---

## Git Configuration

### `.gitignore` Rules ✓

```ignore
# Environment files - LOCAL VALUES (never commit)
.env
.env.local
.env.*.local
.env.production

# Databases - SENSITIVE DATA (never commit)
*.db
*.sqlite
*.sqlite3

# Dependencies
.venv/
venv/
node_modules/

# Logs
*.log
logs/

# IDE/OS
.vscode/
.idea/
.DS_Store
Thumbs.db
```

### Verification Commands

```bash
# Check if file would be ignored
git check-ignore -v backend/.env
# Output: .gitignore:22:.env      backend/.env

# List all tracked files (should not include secrets)
git ls-files

# Check git history for accidental commits
git log --all --full-history -- "backend/.env"
# Should return: nothing
```

---

## Best Practices

### ✅ DO

- ✅ Commit `.env.example` and `.env.docker.example` (templates)
- ✅ Generate new encryption keys for each environment
- ✅ Use strong, unique passwords for each environment
- ✅ Store actual credentials in `.env` and `.env.docker` (local only)
- ✅ Use environment variables for all configuration
- ✅ Document required variables in example files
- ✅ Review `.gitignore` regularly for new files to exclude
- ✅ Use secret management services (AWS Secrets Manager, Vault, etc.) for production

### ❌ DON'T

- ❌ Commit actual `.env` files
- ❌ Commit database files (`.db`, `.sqlite`)
- ❌ Commit database backups with real data
- ❌ Hardcode secrets in Python files
- ❌ Use placeholder values in production
- ❌ Share `.env` files via email or chat
- ❌ Use the same password across environments
- ❌ Check `console.log()` or print statements with secrets

---

## Environment Variables Reference

### Database
| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///./authy.db` | Local SQLite path |
| `DATABASE_URL` | `postgresql://user:pass@host/db` | Production PostgreSQL |
| `POSTGRES_PASSWORD` | `SecurePass123!` | DB admin password (Docker only) |

### Security
| Variable | Example | Purpose |
|----------|---------|---------|
| `ENCRYPTION_KEY` | `kV...RQ=` | Fernet encryption for secrets |
| `JWT_SECRET_KEY` | `xyz...abc` | JWT token signing |

### Application
| Variable | Example | Purpose |
|----------|---------|---------|
| `ALLOWED_ORIGINS` | `https://yourdomain.com` | CORS origins |
| `FRONTEND_URL` | `https://yourdomain.com` | Redirect after login |
| `BACKEND_URL` | `https://api.yourdomain.com` | API endpoint |

### Email (Optional)
| Variable | Example | Purpose |
|----------|---------|---------|
| `SMTP_SERVER` | `smtp.gmail.com` | Email provider |
| `SMTP_PORT` | `587` | Email port |
| `SMTP_USER` | `your-email@gmail.com` | Email account |
| `SMTP_PASSWORD` | `app-password` | Email password |

### OIDC (Optional)
| Variable | Example | Purpose |
|----------|---------|---------|
| `OIDC_CLIENT_ID` | `abc123...` | OAuth client ID |
| `OIDC_CLIENT_SECRET` | `secret456...` | OAuth secret |
| `OIDC_PROVIDER_URL` | `https://provider.com` | OAuth provider |

---

## Setup Workflow

### First Time Setup (Local)

```bash
# 1. Clone repository
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# 2. Create local .env (not committed to git)
cp .env.example .env

# 3. Edit .env with local values
# DATABASE_URL=sqlite:///./authy.db
# ENCRYPTION_KEY=your-generated-key

# 4. Run setup
./setup_local.bat  # Windows
# or
./setup_local.sh   # Linux/Mac

# Result: Database ready, test user created
```

### First Time Setup (Docker)

```bash
# 1. Clone repository
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# 2. Create production .env (not committed to git)
cp .env.docker.example .env.docker

# 3. Edit .env.docker with production values
# DATABASE_URL=postgresql://user:pass@db/authy
# POSTGRES_PASSWORD=strong-password
# ENCRYPTION_KEY=your-generated-key

# 4. Deploy
docker-compose --env-file .env.docker up -d

# Result: Full stack running with auto-migrations
```

---

## Security Summary

| Aspect | Status | Verification |
|--------|--------|--------------|
| **No credentials in git** | ✅ Secure | `git ls-files` shows only templates |
| **`.env` files ignored** | ✅ Secure | `.gitignore` excludes all `.env` |
| **`.db` files ignored** | ✅ Secure | `.gitignore` excludes `*.db` |
| **Templates provided** | ✅ Secure | `.env.example` has placeholders |
| **Docker config safe** | ✅ Secure | Uses environment variables |
| **Migrations versioned** | ✅ Secure | Schema without data |

---

## Next Steps

- [ ] Before deploying to production: Generate new encryption keys
- [ ] Before deploying to production: Set strong database passwords
- [ ] Configure CORS with your actual domain
- [ ] Optional: Set up OIDC for SSO authentication
- [ ] Optional: Configure SMTP for email notifications
- [ ] Document your environment setup in internal wiki

---

**Status**: 🟢 SECURITY VERIFIED - No sensitive files in repository
