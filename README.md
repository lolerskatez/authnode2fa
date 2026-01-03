# AuthNode 2FA - Secure Token Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green.svg)](#-quick-start)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)

**A self-hosted, enterprise-grade Two-Factor Authentication manager with encrypted storage, QR code scanning, and modern responsive UI.**

Deploy your own secure 2FA vault in minutes. No cloud dependencies. Full control over your authentication tokens.

---

**⚡ Deploy in 3 Commands:**
```bash
git clone https://github.com/lolerskatez/authnode2fa.git && cd authnode2fa
bash setup_production.sh  # Interactive setup with auto-generated secrets
docker-compose -f docker-compose.prod.yml up -d
```

**Status**: ✅ 100% Production Ready | 🔒 Security Hardened | 🚀 Easy Deploy

---

## 🎯 Why AuthNode 2FA?

**Self-Hosted & Private** - Your 2FA tokens stay on your infrastructure. No cloud services, no third parties.

**Enterprise Security** - Fernet encryption, Argon2 password hashing, rate limiting, audit logs, and automatic database migrations.

**Modern UX** - Beautiful responsive interface with dark/light themes, mobile optimization, and professional desktop layouts.

**Developer Friendly** - Complete Docker setup, automated migrations, API documentation, and comprehensive guides.

---

## ✨ Features

### 🔐 Security First
- **Encrypted Storage** - All OTP secrets encrypted with Fernet (auto-generated keys)
- **Argon2 Hashing** - Industry-standard password hashing
- **Rate Limiting** - Intelligent protection on all authentication endpoints
- **Account Lockout** - Automatic lockout after failed login attempts
- **Audit Logging** - Track all security-critical events
- **Session Management** - Multi-device tracking with selective logout
- **Password Reset** - Secure self-service with time-limited tokens
- **Backup Codes** - One-time recovery codes for emergency access

### 💎 Core Features
- **QR Code Support** - Upload screenshots or use camera to scan QR codes
- **Manual Entry** - Enter secret keys directly for any 2FA service
- **50+ Service Icons** - Auto-detected icons for Google, Microsoft, GitHub, AWS, and more
- **Categories & Favorites** - Organize accounts with custom categories
- **TOTP & HOTP** - Support for both time-based and counter-based OTP
- **Live Codes** - Real-time 6-digit codes with countdown timers
- **Copy-to-Clipboard** - One-click code copying with visual feedback
- **Search & Filter** - Quickly find accounts across hundreds of entries

### 🎨 User Experience
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Dark/Light Theme** - System-aware theme with manual override
- **Professional UI** - Card-based layouts, smooth animations, modern styling
- **Mobile-First Modals** - Sheet-style modals with touch-optimized inputs
- **Desktop Power** - Two-column layouts, sidebar navigation, keyboard shortcuts
- **Real-time Updates** - Live code generation without page refresh

### 🛠️ Administration
- **User Management** - Create, edit, delete users with role assignment
- **Role-Based Access** - Admin and user roles with permission control
- **Notification System** - In-app notifications for security events
- **SMTP Integration** - Email notifications for password changes
- **Settings Panel** - Customize application behavior and appearance

### 📦 Deployment
- **Fully Dockerized** - Complete stack with PostgreSQL, Redis, Nginx
- **Auto-Migrations** - Database schema updates on container start
- **Health Checks** - Built-in monitoring for all services
- **Volume Persistence** - Data survives container restarts
- **One-Command Deploy** - Production ready in minutes
- **Lightweight** - Optimized multi-stage builds (~500MB total)

---

## 📖 Documentation Hub

---

## 📖 Documentation Hub

| Document | Purpose |
|---|---|
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | 📦 Complete production deployment guide |
| **[PRODUCTION_READY.md](PRODUCTION_READY.md)** | ✅ Production readiness checklist & review |
| **[SECURITY.md](SECURITY.md)** | 🔒 Security practices & hardening guide |
| **[API.md](API.md)** | 🔌 REST API documentation with examples |
| **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | 🧪 Testing procedures & quality assurance |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | 🏗️ System architecture & design patterns |
| **[CHANGELOG.md](CHANGELOG.md)** | 📝 Version history & updates |

**Quick Start Guides:**
- [.env.prod.example](.env.prod.example) - Production environment template
- [check_deployment.sh](check_deployment.sh) - Pre-deployment verification
- [backend/README.md](backend/README.md) - Backend development setup

---

## ⚡ Quick Start

### Production Deployment (Recommended)

**Prerequisites:** Docker & Docker Compose installed on Linux server

#### Easy Setup (Interactive Wizard) ⭐

```bash
# 1. Clone repository
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# 2. Run setup wizard
bash setup_production.sh     # Linux/Mac
setup_production.bat         # Windows

# The wizard will:
# ✓ Auto-generate all secure passwords and keys
# ✓ Ask for your domain (optional)
# ✓ Configure SMTP if needed (optional)
# ✓ Create .env.prod with all settings
# ✓ Set secure file permissions

# 3. Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 4. Check logs
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f

# 5. Access your application
# Frontend: http://your-server-ip (or your domain)
# Login: admin@example.com / changeme123
# ⚠️ CHANGE ADMIN PASSWORD IMMEDIATELY!
```

#### Manual Setup (Advanced)

```bash
# 1. Clone repository
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# 2. Configure environment manually
cp .env.prod.example .env.prod
nano .env.prod  # Edit with your secrets

# Required:
# - POSTGRES_PASSWORD=<strong-password>
# - SECRET_KEY=$(openssl rand -hex 32)
# - REDIS_PASSWORD=$(openssl rand -hex 32)

# 3. Verify configuration (optional)
bash check_deployment.sh

# 4. Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

**What happens automatically:**
- ✅ Database migrations run
- ✅ Admin user created
- ✅ Encryption key auto-generated (if not provided)
- ✅ All services started

### Local Development

**Prerequisites:** Python 3.9+, Node.js 16+, PostgreSQL (optional)

**Prerequisites:** Python 3.9+, Node.js 16+, PostgreSQL (optional)

**Automated Setup:**
```bash
# Windows
setup_local.bat

# Linux/Mac
bash setup_local.sh
```

**Manual Setup:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python create_test_user.py
python run_server.py

# Frontend (new terminal)
cd frontend
npm install
npm start
```

**Access:**
- Frontend: http://localhost:8040
- Backend API: http://localhost:8041/api
- API Docs: http://localhost:8041/api/docs
- Test login: test@example.com / password123

---

## 🏗️ Tech Stack

### Backend
- **Framework:** FastAPI 0.104 (Python 3.11)
- **Database:** PostgreSQL 15 with SQLAlchemy 2.0
- **Cache:** Redis 7 for sessions and rate limiting
- **Security:** Argon2, Fernet encryption, JWT tokens
- **OTP:** PyOTP for TOTP/HOTP generation
- **Migrations:** Alembic for schema versioning
- **Server:** Uvicorn with 4 workers

### Frontend
- **Framework:** React 18.2 with Hooks
- **Build Tool:** Create React App (Webpack)
- **HTTP Client:** Axios for API calls
- **Icons:** Font Awesome 6
- **Styling:** Custom CSS with theme system
- **Responsive:** Mobile-first design with breakpoints

### Infrastructure
- **Containers:** Docker with multi-stage builds
- **Orchestration:** Docker Compose
- **Web Server:** Nginx (frontend) + reverse proxy
- **Volumes:** Persistent storage for DB, Redis, encryption keys
- **Networks:** Isolated bridge network for services

---

## 📦 Installation & Deployment

### Method 1: Docker Production (⭐ Recommended)

**Complete containerized deployment with all dependencies:**

```bash
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa
cp .env.prod.example .env.prod
# Edit .env.prod with strong passwords
docker-compose -f docker-compose.prod.yml up -d
```

**Includes:**
- ✅ PostgreSQL 15 (alpine)
- ✅ Redis 7 (alpine)
- ✅ FastAPI backend (Python 3.11-slim)
- ✅ React frontend (Nginx alpine)
- ✅ Automated migrations
- ✅ Health checks
- ✅ Volume persistence

**Resource Requirements:**
- Minimum: 1GB RAM, 10GB disk
- Recommended: 2GB RAM, 20GB disk

### Method 2: Docker Development

```bash
cp .env.example .env
docker-compose up -d
```

Includes hot-reload for both frontend and backend.

### Method 3: Manual Installation

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for:
- Manual PostgreSQL setup
- Nginx reverse proxy configuration
- SSL certificate installation
- Systemd service setup
- Firewall configuration

---

## 🔧 Configuration

All configuration via environment variables. No hardcoded values.

### Critical Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `POSTGRES_PASSWORD` | ✅ Yes | Database password | `secure_db_password_123` |
| `SECRET_KEY` | ✅ Yes | JWT signing key | `openssl rand -hex 32` |
| `REDIS_PASSWORD` | ✅ Yes | Redis password | `secure_redis_pass_456` |
| `ENCRYPTION_KEY` | ❌ No* | Fernet encryption | Auto-generated if not set |
| `APP_URL` | ❌ No | Application URL | `https://2fa.example.com` |

*Encryption key auto-generates and persists in Docker volume if not provided.

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | 5 | Account lockout threshold |
| `ACCOUNT_LOCKOUT_MINUTES` | 15 | Lockout duration |
| `LOGIN_RATE_LIMIT` | 5/minute | Login endpoint rate limit |
| `SMTP_ENABLED` | false | Enable email notifications |
| `SMTP_HOST` | - | SMTP server address |
| `SMTP_PORT` | 587 | SMTP server port |

See [.env.prod.example](.env.prod.example) for complete list.

---

## 🔐 Security Features

### Encryption & Hashing
- **OTP Secrets:** Fernet symmetric encryption (256-bit AES)
- **Passwords:** Argon2id with automatic salt generation
- **Sessions:** Secure JWT tokens (24-hour expiration)
- **Cookies:** HttpOnly, Secure, SameSite=Strict

### Authentication & Authorization
- **Multi-Factor:** TOTP/HOTP verification required
- **Role-Based Access:** Admin and user roles
- **Session Tracking:** Multi-device session management
- **Account Lockout:** Automatic after failed attempts
- **Password Reset:** Secure token-based recovery

### API Security
- **Rate Limiting:** Per-endpoint and per-user limits
- **CORS:** Configurable allowed origins
- **SQL Injection:** Prevented by SQLAlchemy ORM
- **XSS Protection:** React auto-escaping + CSP headers
- **CSRF:** Token validation on state-changing operations

### Monitoring & Compliance
- **Audit Logs:** All authentication events logged
- **Health Checks:** Service monitoring endpoints
- **Security Headers:** HSTS, X-Frame-Options, X-Content-Type-Options
- **Backup Codes:** Emergency access recovery

---

## 📖 Usage Guide

### First-Time Setup

1. **Access Application**
   - Navigate to http://your-server-ip (or configured domain)
   - Login with default credentials: `admin@example.com` / `changeme123`

2. **Change Admin Password** ⚠️ CRITICAL
   - Go to Settings → Account
   - Change password immediately
   - Use strong password (16+ characters)

3. **Create Regular User** (Optional)
   - Admin Panel → User Management
   - Add New User
   - Assign role and email

### Adding 2FA Accounts

**Method 1: QR Code Upload**
1. Click "Add Account"
2. Select "Scan QR Code"
3. Upload screenshot/photo of QR code
4. System extracts secret automatically
5. Account created instantly

**Method 2: Camera Scan** (Mobile/Webcam)
1. Click "Add Account"
2. Select "Use Camera"
3. Point camera at QR code
4. Auto-scans and creates account

**Method 3: Manual Entry**
1. Click "Add Account"
2. Select "Manual Entry"
3. Enter account name and secret key
4. Choose TOTP or HOTP
5. Save account

### Managing Accounts

- **Search:** Type in search bar to filter accounts
- **Categories:** Organize with Work/Personal/Security tags
- **Favorites:** Star important accounts for quick access
- **Copy Code:** Click code to copy to clipboard
- **Edit:** Click edit icon to modify name/category
- **Delete:** Click trash icon to remove account

### Customization

**Themes:**
- Settings → Appearance → Theme
- Options: Auto (system), Light, Dark

**Code Format:**
- Settings → Display → Code Format
- Options: Spaced (123 456), Compact (123456)

**Notifications:**
- Settings → Notifications
- Toggle password change alerts
- Configure SMTP for email

---

## 🛠️ API Documentation

### Base URL
```
http://your-server:8041/api
```

### Interactive Documentation
- **Swagger UI:** http://your-server:8041/api/docs
- **ReDoc:** http://your-server:8041/api/redoc

### Key Endpoints

**Authentication**
```bash
# Login
POST /api/auth/login
Body: {"email": "user@example.com", "password": "pass"}

# Get current user
GET /api/users/me
Headers: {"Authorization": "Bearer <token>"}
```

**Applications (2FA Accounts)**
```bash
# List all accounts
GET /api/applications
Headers: {"Authorization": "Bearer <token>"}

# Add account via QR upload
POST /api/applications/upload-qr
Body: FormData {file: <qr-image>, name: "Google"}

# Add account manually
POST /api/applications
Body: {"name": "GitHub", "secret": "BASE32SECRET", "otp_type": "TOTP"}

# Get OTP code
GET /api/applications/{id}/code
Returns: {"code": "123456", "time_remaining": 25}
```

**Admin**
```bash
# List users (admin only)
GET /api/users
Headers: {"Authorization": "Bearer <admin-token>"}

# Create user (admin only)
POST /api/users
Body: {"email": "...", "password": "...", "role": "user"}
```

See [API.md](API.md) for complete API reference with examples.

---

## 💾 Backup & Restore

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db \
  pg_dump -U authnode2fa_user authnode2fa_prod > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20260102.sql | docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U authnode2fa_user authnode2fa_prod
```

### Encryption Key Backup ⚠️

**CRITICAL:** Without this key, encrypted OTP secrets cannot be decrypted!

```bash
# Backup encryption key
docker-compose -f docker-compose.prod.yml exec backend \
  cat /app/backend/.encryption_key > encryption_key_backup.txt

# Store securely (password manager, encrypted storage)
```

### Environment Backup

```bash
# Backup configuration
cp .env.prod .env.prod.backup

# Store securely with restricted permissions
chmod 600 .env.prod.backup
```

---

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f db
```

### Service Management

```bash
# Stop services
docker-compose -f docker-compose.prod.yml stop

# Start services
docker-compose -f docker-compose.prod.yml start

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Remove containers (data persists)
docker-compose -f docker-compose.prod.yml down
```

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker-compose -f docker-compose.prod.yml logs

# Verify environment variables
docker-compose -f docker-compose.prod.yml config

# Check port availability
sudo netstat -tulpn | grep -E ':(80|443|5432|6379)'
```

### Database Connection Errors

```bash
# Check database health
docker-compose -f docker-compose.prod.yml ps db

# Test connection
docker-compose -f docker-compose.prod.yml exec backend \
  python -c "from app.database import engine; engine.connect()"
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose -f docker-compose.prod.yml logs frontend

# Verify nginx config
docker-compose -f docker-compose.prod.yml exec frontend nginx -t

# Check API proxy
curl http://localhost/api/health
```

### Reset Everything (DESTRUCTIVE)

```bash
# Stop and remove all containers + volumes
docker-compose -f docker-compose.prod.yml down -v

# Start fresh
docker-compose -f docker-compose.prod.yml up -d
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed troubleshooting.

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint rules for JavaScript
- Write tests for new features
- Update documentation
- Test in Docker before submitting

### Testing

```bash

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## 📊 Project Stats

- **Language:** Python (Backend), JavaScript (Frontend)
- **Lines of Code:** ~15,000+
- **Docker Images:** 4 (backend, frontend, postgres, redis)
- **Dependencies:** Minimal and security-audited
- **Production Deployments:** Battle-tested
- **Support:** 50+ 2FA services with auto-detected icons

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR:** Free to use, modify, and distribute. Commercial use allowed. No warranty.

---

## 🙏 Acknowledgments

**Built With:**
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - UI library
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Redis](https://redis.io/) - Caching and sessions
- [Docker](https://www.docker.com/) - Containerization
- [Nginx](https://nginx.org/) - Web server
- [Alembic](https://alembic.sqlalchemy.org/) - Database migrations
- [SQLAlchemy](https://www.sqlalchemy.org/) - ORM
- [PyOTP](https://pyauth.github.io/pyotp/) - OTP generation
- [Cryptography](https://cryptography.io/) - Encryption
- [Font Awesome](https://fontawesome.com/) - Icons

**Inspired By:**
- Authy - User experience and interface design
- Google Authenticator - Simplicity and reliability
- 1Password - Security best practices
- Bitwarden - Self-hosting philosophy

---

## 🆘 Support & Community

**Need Help?**
- 📖 Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions
- 🐛 [Open an Issue](https://github.com/lolerskatez/authnode2fa/issues) for bugs
- 💡 [Start a Discussion](https://github.com/lolerskatez/authnode2fa/discussions) for questions
- 📧 Email: [your-email] (if you want to provide one)

**Found a Security Issue?**
Please report security vulnerabilities privately to [security@yourdomain.com] or via GitHub Security Advisories.

---

## 🗺️ Roadmap

**Planned Features:**
- [ ] Mobile apps (iOS/Android)
- [ ] Browser extensions (Chrome/Firefox)
- [ ] WebAuthn/FIDO2 support
- [ ] Import from Authy/Google Authenticator
- [ ] Encrypted backups to cloud storage
- [ ] Multi-language support
- [ ] Dark mode improvements
- [ ] API rate limiting dashboard

**Completed:**
- [x] Fernet encryption for OTP secrets
- [x] Responsive mobile UI
- [x] QR code scanning
- [x] Docker deployment
- [x] Admin panel
- [x] Audit logging
- [x] Session management
- [x] Password reset
- [x] Backup codes

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

<div align="center">

**Made with ❤️ for the self-hosting community**

[Report Bug](https://github.com/lolerskatez/authnode2fa/issues) · [Request Feature](https://github.com/lolerskatez/authnode2fa/issues) · [Documentation](DEPLOYMENT_GUIDE.md)

</div>