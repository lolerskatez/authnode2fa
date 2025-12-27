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

### Quick Start with Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/2fa-manager.git
   cd 2fa-manager
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (OIDC, SMTP, secrets)
   ```

3. **Run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - Frontend: http://localhost
   - API Docs: http://localhost/api/docs

### Local Development

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Configure .env
python run_server.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

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