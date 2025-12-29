# 2FA Manager - Production Ready

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green.svg)](#-production-ready)

A secure, full-stack web application for managing Two-Factor Authentication (2FA) tokens with OIDC SSO integration, QR code extraction, and encrypted storage. Built with React frontend and FastAPI backend, containerized for easy deployment.

**Status**: ✅ 100% Production Ready - Deploy today in 10 minutes

## 🚀 Features

### Core Features
- **User Management**: OIDC SSO authentication with role-based access control
- **2FA Application Management**: Upload QR codes, manage accounts with categories and favorites
- **Secure Storage**: Encrypted secrets using Fernet encryption
- **Responsive UI**: Modern React interface with dark/light theme support
- **Docker Deployment**: Complete containerized setup with nginx reverse proxy
- **Admin Panel**: User and application management for administrators
- **Settings**: Customizable themes, code formatting, and SMTP configuration

### Security Features (New) ✅
- **Password Reset**: Self-service account recovery with time-limited tokens
- **Session Management**: Track active sessions, revoke devices, logout all sessions
- **Backup Code Recovery**: One-time use backup codes for 2FA fallback access
- **Audit Logging**: Comprehensive security event logging for compliance
- **Rate Limiting**: Protected endpoints with intelligent rate limiting (already implemented)

## ⚡ Quick Start (10 minutes)

### Production Deployment

```bash
# 1. Clone and setup
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# 2. Configure
cp .env.docker.example .env.docker
nano .env.docker  # Edit with your domain, passwords, API keys

# 3. Deploy
docker-compose --env-file .env.docker up -d
```

**Access your application**:
- Frontend: `https://yourdomain.com`
- Backend API: `https://yourdomain.com/api`
- API Docs: `https://yourdomain.com/api/docs`

### Local Development

```bash
# Windows
./setup_local.bat

# Linux/Mac
./setup_local.sh
```

Then:
- Frontend: http://localhost:8040
- Backend: http://localhost:8041
- Test user: `test@example.com` / `password123`

## 📋 Prerequisites

| Environment | Requirements |
|---|---|
| **Production** | Docker + Docker Compose + Linux server |
| **Local Dev** | Python 3.9+ + Node.js 16+ |
| **Testing** | Docker Compose (included) |

## 📚 Documentation

| Document | Purpose |
|---|---|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Complete setup guide (all environments) |
| [SECURITY.md](SECURITY.md) | Security practices & secret management |
| [CHANGELOG.md](CHANGELOG.md) | Version history & updates |

**Specific guides**:
- [backend/README.md](backend/README.md) - Backend API documentation
- [.env.example](.env.example) - Local environment template
- [.env.docker.example](.env.docker.example) - Production environment template

## 🛠 Installation Methods

### Method 1: Docker (Recommended) ⭐

```bash
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa
cp .env.docker.example .env.docker
# Edit .env.docker with your values
docker-compose --env-file .env.docker up -d
```

Features:
- ✅ Full containerized stack
- ✅ Automatic database migrations
- ✅ Built-in reverse proxy (nginx)
- ✅ PostgreSQL included
- ✅ Zero manual setup

### Method 2: Local Development

```bash
# Automated
./setup_local.bat  # Windows
./setup_local.sh   # Linux/Mac

# Or manual
cd backend && python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python create_test_user.py
python run_server.py

# New terminal
cd frontend && npm install
PORT=8040 npm start
```

### Method 3: Manual Production Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions including:
- Manual PostgreSQL configuration
- Nginx reverse proxy setup
- SSL certificate installation
- Supervisor/systemd service configuration

## 🔧 Configuration

All configuration via environment variables. Templates provided:

| Template | Purpose |
|---|---|
| [.env.example](.env.example) | Local development |
| [.env.docker.example](.env.docker.example) | Production (Docker) |

**Common settings**:
```bash
DATABASE_URL=postgresql://user:pass@host/authy
ENCRYPTION_KEY=<generated-fernet-key>
ALLOWED_ORIGINS=https://yourdomain.com
POSTGRES_PASSWORD=<strong-password>
```

See [SECURITY.md](SECURITY.md) for secret generation & best practices.

## 🔐 Security Features

### Password Reset
- Users can request password reset via email
- Secure time-limited tokens (1-hour expiration)
- Automatic logout from all sessions after reset
- **Endpoint**: `POST /api/auth/password-reset`, `POST /api/auth/password-reset/confirm`

### Session Management
- Track all active user sessions with device information
- Revoke individual sessions or all other sessions
- IP address and user agent logging
- **Endpoint**: `GET /api/users/sessions`, `DELETE /api/users/sessions/{id}`, `POST /api/users/sessions/revoke-all`

### Backup Code Recovery
- 10 automatically generated backup codes per user
- One-time use for 2FA fallback if authenticator lost
- Regenerate codes anytime
- **Endpoint**: `POST /api/auth/2fa/verify-backup-code`, `GET /api/auth/2fa/backup-codes-remaining`, `POST /api/auth/2fa/regenerate-backup-codes`

### Audit Logging
- Comprehensive logging of all authentication events
- Filter by user, action, or date (admin only)
- Export for compliance reporting
- **Endpoint**: `GET /api/admin/audit-logs`, `GET /api/admin/audit-logs/user/{id}`

## 📖 Usage

1. **Login**: Use OIDC SSO or local authentication
2. **Add Applications**: Upload QR codes or manually enter secrets
3. **Organize**: Use categories and favorites for better management
4. **Settings**: Customize theme, code format, and notifications
5. **Admin**: Manage users and global settings (admin role required)

## 🏗 API Documentation

- **Base URL**: `/api`
- **Interactive Docs**: Visit `/api/docs` for Swagger UI
- **Endpoints**:
  - `GET /api/users/me` - Current user info
  - `POST /api/applications` - Add 2FA application
  - `GET /api/applications` - List applications
  - `PUT /api/settings` - Update settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://reactjs.org/)
- Icons from [React Icons](https://react-icons.github.io/react-icons/)
- UI components inspired by modern design patterns