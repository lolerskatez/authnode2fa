# 2FA Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

A secure, full-stack web application for managing Two-Factor Authentication (2FA) tokens with OIDC SSO integration, QR code extraction, and encrypted storage. Built with React frontend and FastAPI backend, containerized for easy deployment.

## 🚀 Features

- **User Management**: OIDC SSO authentication with role-based access control
- **2FA Application Management**: Upload QR codes, manage accounts with categories and favorites
- **Secure Storage**: Encrypted secrets using Fernet encryption
- **Notifications**: SMTP email notifications for security events
- **Responsive UI**: Modern React interface with dark/light theme support
- **Docker Deployment**: Complete containerized setup with nginx reverse proxy
- **Admin Panel**: User and application management for administrators
- **Settings**: Customizable themes, code formatting, and SMTP configuration

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local frontend development)
- Python 3.9+ (for local backend development)

## 🛠 Installation

### 🏃 Quick Start - Choose Your Path

#### **Fast Track** - Production Ready (10 min)
**→ See [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md)**

#### **Docker** - Recommended

1. Clone the repository and configure:
   ```bash
   git clone https://github.com/lolerskatez/authnode2fa.git
   cd authnode2fa
   cp .env.docker.example .env.docker
   # Edit .env.docker with your settings
   ```

2. Build and run:
   ```bash
   docker-compose --env-file .env.docker up -d --build
   ```

3. Access at http://localhost (or your domain after Nginx setup)

#### **Local Development**

Automated setup:
```bash
# Linux/Mac
./setup_local.sh

# Windows
setup_local.bat
```

Manual setup:
```bash
# Backend
cd backend && python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python create_test_user.py
python run_server.py

# Frontend (new terminal)
cd frontend && npm install && PORT=8040 npm start
```

Access at:
- Frontend: http://localhost:8040
- Backend: http://localhost:8041
- Test user: `test@example.com` / `password123`

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md) | 10-minute production deployment |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Detailed deployment instructions |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Pre-deployment checklist |
| [TESTING_RESULTS.md](TESTING_RESULTS.md) | Test results and verification |

## 🔧 Configuration

Configure via environment variables or `.env` files:

- **OIDC Settings**: Client ID, secret, issuer URL
- **Database**: SQLite path or external DB
- **SMTP**: Email server configuration
- **Security**: Encryption keys, JWT secrets

## 📖 Usage

1. **Login**: Authenticate via OIDC SSO
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