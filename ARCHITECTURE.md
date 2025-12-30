# Architecture & Modularity Guide

Comprehensive overview of AuthNode2FA's modular, production-grade architecture.

---

## 🏗️ Architecture Overview

AuthNode2FA is designed as a **modular, layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React 18)               │
│  Components → Views → State Management → API Layer  │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/HTTPS
┌────────────────────▼────────────────────────────────┐
│              REVERSE PROXY (Nginx)                  │
│        ├─ CORS Handling                             │
│        ├─ SSL/TLS Termination                       │
│        └─ Request Routing                           │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│            BACKEND API (FastAPI)                     │
│  ├─ auth.py        → Authentication & Authorization │
│  ├─ users.py       → User Management                │
│  ├─ applications.py → 2FA Token CRUD               │
│  ├─ admin.py       → Admin Functions               │
│  ├─ webauthn.py    → Security Keys                 │
│  └─ core modules:                                   │
│     ├─ database.py → ORM Configuration             │
│     ├─ models.py   → SQLAlchemy Models             │
│     ├─ schemas.py  → Request/Response Validation   │
│     ├─ crud.py     → Database Operations           │
│     ├─ security_monitor.py → Audit Logging        │
│     └─ utils.py    → Helper Functions              │
└────────────────────┬─────────────────────────────────┘
                     │ SQL
┌────────────────────▼─────────────────────────────────┐
│         DATABASE (PostgreSQL)                        │
│  ├─ users         → User accounts & credentials      │
│  ├─ applications  → 2FA tokens & metadata           │
│  ├─ smtp_config   → Email configuration             │
│  ├─ user_preferences → Individual preferences       │
│  └─ global_settings → System-wide configuration     │
└──────────────────────────────────────────────────────┘
```

---

## 🧩 Module Design

### Backend: Separation of Concerns

```
app/
├── routers/              # API Endpoint Layer
│   ├── auth.py          # User authentication & authorization
│   ├── users.py         # User profile & preferences
│   ├── applications.py  # 2FA app management
│   ├── admin.py         # Administrative operations
│   └── webauthn.py      # Security key operations
│
├── models.py            # Data Layer - SQLAlchemy ORM
│   ├── User model
│   ├── Application model
│   ├── SMTPConfig model
│   ├── UserPreferences model
│   └── GlobalSettings model
│
├── schemas.py           # Validation Layer - Pydantic
│   ├── UserCreate, UserUpdate
│   ├── ApplicationCreate, ApplicationUpdate
│   ├── LoginRequest, TokenResponse
│   └── 50+ other schemas
│
├── crud.py              # Database Layer - SQL operations
│   ├── create_user()
│   ├── get_user_by_email()
│   ├── create_application()
│   └── 30+ CRUD operations
│
├── database.py          # ORM Configuration
│   ├── SQLAlchemy setup
│   ├── Connection pooling
│   └── Session management
│
├── auth.py              # Authentication Logic
│   ├── Password hashing (Argon2)
│   ├── JWT token generation
│   ├── OIDC integration
│   └── Rate limiting
│
├── security_monitor.py  # Security & Audit
│   ├── Audit log creation
│   ├── Event tracking
│   └── Compliance logging
│
├── utils.py             # Utilities
│   ├── Email sending
│   ├── QR code parsing
│   └── Helper functions
│
└── main.py              # Application Entry Point
    ├── FastAPI initialization
    ├── Router registration
    ├── Middleware setup
    └── Exception handlers
```

### Frontend: Component Structure

```
src/
├── components/          # Reusable Components
│   ├── AccountCard.js   # Single 2FA account display
│   ├── Header.js        # Navigation & theme
│   ├── Modal.js         # Dialog component
│   └── Toast.js         # Notifications
│
├── views/              # Page-Level Components
│   ├── LoginView.js     # Authentication page
│   ├── AuthenticatorView.js  # Main app (token display)
│   ├── UserManagement.js     # Admin panel
│   ├── SettingsView.js  # Configuration
│   └── ProfileView.js   # User profile
│
├── layouts/            # Layout Components
│   ├── MainLayout.js    # Main app layout
│   ├── AuthLayout.js    # Login/signup layout
│   └── AdminLayout.js   # Admin dashboard
│
├── utils/              # Utility Functions
│   ├── api.js           # API client
│   ├── auth.js          # Authentication helpers
│   └── formatting.js    # Code formatting
│
├── App.js              # Root Component
│   ├── Router setup
│   ├── State management
│   └── Theme handling
│
└── index.js            # Entry Point
```

---

## 🔐 Security Architecture

### Layered Security

```
Layer 1: Transport Security
├─ HTTPS/TLS at reverse proxy (Nginx)
├─ Certificate management (Let's Encrypt)
└─ HTTP to HTTPS redirect

Layer 2: API Security
├─ CORS validation
├─ Rate limiting (slowapi)
├─ Input validation (Pydantic)
└─ SQL injection prevention (ORM)

Layer 3: Authentication
├─ Password hashing (Argon2)
├─ JWT token signing
├─ OIDC/SSO support
└─ Session management

Layer 4: Data Security
├─ Encryption at rest (Fernet)
├─ Encryption in transit (HTTPS)
├─ Database access control
└─ Secure password reset

Layer 5: Audit & Monitoring
├─ Security event logging
├─ Audit trail
├─ Failed login tracking
└─ Account lockout
```

### Encryption Strategy

```
Fernet Encryption (Symmetric)
├─ Used for: 2FA secrets, sensitive data
├─ Key: ENCRYPTION_KEY environment variable
├─ Rotation: Supported via migration scripts
└─ At Rest: Database stores encrypted value

JWT Token (Asymmetric signing)
├─ Used for: Session management
├─ Key: JWT_SECRET_KEY environment variable
├─ Expiration: Configurable (default 30 days)
└─ Refresh: Via /api/auth/refresh endpoint

Password Hashing (One-way)
├─ Algorithm: Argon2 (via passlib)
├─ Verification: Constant-time comparison
├─ Migration: From bcrypt to Argon2 supported
└─ Cost: 4 time factor (production-safe)
```

---

## 🗄️ Database Architecture

### Entity Relationship Diagram

```
┌──────────────┐
│    User      │ (1:Many)  ┌──────────────────┐
│──────────────│ ◄───────── │  Application    │
│ id           │           │──────────────────│
│ email        │           │ id               │
│ username     │           │ name             │
│ password_hash│           │ secret (encrypted)
│ oidc_id      │           │ category         │
│ role         │           │ favorite         │
│ settings     │           │ user_id (FK)    │
│ created_at   │           │ created_at       │
└──────────────┘           └──────────────────┘

┌──────────────┐
│  UserPreferences │ (1:1)
│──────────────────│
│ id                │
│ user_id (FK/UK)   │
│ email_notif_...   │
│ created_at        │
└──────────────────┘

┌──────────────┐
│ GlobalSettings │
│──────────────────│
│ id                │
│ theme             │
│ signup_enabled    │
│ totp_enforcement  │
│ etc...            │
└──────────────────┘

┌──────────────┐
│  SMTPConfig    │
│──────────────────│
│ id                │
│ enabled           │
│ host              │
│ port              │
│ username          │
│ password (encrypted)
│ from_email        │
└──────────────────┘
```

### Indexing Strategy

```
Optimized for Read Performance:
├─ users.email (UNIQUE, INDEX) → Fast login lookups
├─ users.username (UNIQUE, INDEX) → User discovery
├─ users.oidc_id (UNIQUE, INDEX) → SSO mapping
├─ applications.user_id (INDEX) → User's apps listing
├─ applications.name (INDEX) → Search
└─ applications.category (INDEX) → Filtering

Foreign Keys for Referential Integrity:
├─ Application.user_id → User.id (ON DELETE CASCADE)
└─ UserPreferences.user_id → User.id (ON DELETE CASCADE)
```

---

## 🔄 Data Flow

### User Authentication Flow

```
1. User Input
   └─ Email & Password (or OIDC redirect)

2. API Layer (auth.py router)
   ├─ Validate input (Pydantic schema)
   ├─ Rate limit check
   └─ Call auth logic

3. Auth Layer (auth.py module)
   ├─ Hash password with Argon2
   ├─ Verify against stored hash
   ├─ Generate JWT token
   └─ Update session

4. Database Layer (crud.py)
   └─ Write session record

5. Response Layer
   ├─ Return JWT token
   ├─ Set secure cookie (if configured)
   └─ Response schema validation

6. Frontend
   ├─ Store JWT in localStorage/cookie
   ├─ Include in Authorization header
   └─ Redirect to dashboard
```

### 2FA Token Management Flow

```
1. User Uploads QR Code
   └─ PNG/JPEG file upload

2. Processing Layer
   ├─ Decode QR code (pyzbar)
   ├─ Extract secret from URI
   ├─ Validate TOTP format
   └─ Generate backup codes

3. Encryption Layer
   ├─ Generate Fernet cipher
   ├─ Encrypt secret
   └─ Store cipher key separately

4. Storage Layer
   └─ Insert encrypted secret in database

5. Display Layer
   ├─ Generate TOTP code (pyotp)
   ├─ Update every 30 seconds
   └─ Cache in state

6. Verification
   ├─ User scans app (authenticator)
   ├─ 6-digit code generated
   └─ Verified against time window
```

---

## 🚀 Deployment Architecture

### Docker Compose Stack

```
docker-compose.yml
├── db service
│   ├─ Image: postgres:15
│   ├─ Port: 5432 (internal only)
│   ├─ Volume: postgres_data (persistent)
│   └─ Environment: Database credentials
│
├── backend service
│   ├─ Build: ./backend/Dockerfile
│   ├─ Port: 8041 (exposed)
│   ├─ Depends: db (waits for readiness)
│   ├─ Environment: All config variables
│   ├─ Health Check: /health endpoint
│   └─ Restart: unless-stopped
│
├── frontend service
│   ├─ Build: ./frontend/Dockerfile
│   ├─ Port: 8040 (exposed)
│   ├─ Environment: REACT_APP_API_URL
│   ├─ Restart: unless-stopped
│   └─ Volumes: Source code (dev mode)
│
└── volumes
    └─ postgres_data (persistent storage)
```

### Nginx Reverse Proxy Configuration

```
Routing:
├─ / → Frontend (React)
│  └─ Static assets + SPA
│
├─ /api → Backend (FastAPI)
│  ├─ /api/docs → Swagger UI
│  ├─ /api/auth → Authentication
│  ├─ /api/users → User management
│  ├─ /api/applications → 2FA apps
│  └─ /api/admin → Admin panel
│
└─ SSL/TLS
   ├─ Certificate: Let's Encrypt
   ├─ Renewal: Certbot automation
   └─ Redirect: HTTP → HTTPS
```

---

## 🧪 Testing Architecture

### Test Layers

```
Unit Tests (test_*.py)
├─ test_auth.py
│  ├─ Password hashing
│  ├─ Token generation
│  └─ Login/logout
│
├─ test_users.py
│  ├─ User CRUD
│  ├─ Profile updates
│  └─ Preferences
│
├─ test_applications.py
│  ├─ 2FA CRUD
│  ├─ QR parsing
│  └─ Backup codes
│
└─ test_security.py
   ├─ Rate limiting
   ├─ Authentication
   └─ Authorization
```

### Test Infrastructure

```
conftest.py (Shared Fixtures)
├─ engine → SQLAlchemy engine (in-memory SQLite)
├─ db_session → Fresh database per test
├─ client → FastAPI test client
├─ test_user → Predefined test user
└─ test_app → Test 2FA application

pytest.ini Configuration
├─ Test paths: tests/
├─ Coverage: app/ module
├─ Markers: unit, integration, security, slow
└─ Reports: HTML + terminal
```

---

## 📦 Dependency Management

### Backend Dependencies (Pinned Versions)

```
Core Framework:
├─ fastapi==0.104.1 → REST API framework
└─ uvicorn[standard]==0.24.0 → ASGI server

Database & ORM:
├─ sqlalchemy==2.0.23 → ORM
├─ alembic==1.12.1 → Migrations
└─ psycopg2-binary==2.9.9 → PostgreSQL driver

Authentication & Security:
├─ authlib==1.3.0 → OAuth/OIDC
├─ python-jose==3.3.0 → JWT
├─ passlib[bcrypt]==1.7.4 → Password hashing
├─ argon2-cffi==21.3.0 → Argon2
├─ cryptography==41.0.7 → Encryption
└─ webauthn==1.8.0 → Security keys

2FA & Tokens:
├─ pyotp==2.9.0 → TOTP generation
├─ qrcode[pil]==7.4.2 → QR code generation
└─ pyzbar==0.1.9 → QR code scanning

Email & HTTP:
├─ aiosmtplib==2.0.2 → Async SMTP
├─ python-multipart==0.0.6 → Form parsing
└─ httpx==0.25.2 → HTTP client

Rate Limiting & Utilities:
├─ slowapi==0.1.9 → Rate limiting
├─ python-dotenv==1.0.0 → Environment variables
└─ pytest==7.4.3 → Testing framework
```

### Frontend Dependencies

```
Core:
├─ react==18.2.0 → UI framework
├─ react-dom==18.2.0 → React DOM
└─ react-scripts==5.0.1 → Build tools

HTTP & Storage:
├─ axios==1.4.0 → API client
└─ (localStorage via browser API)

Testing & Quality:
├─ @testing-library/react==13.3.0
├─ @testing-library/jest-dom==5.16.4
└─ @testing-library/user-event==13.5.0
```

---

## 🔧 Configuration Management

### Environment Variable Organization

```
Database Configuration
├─ DATABASE_URL → Connection string (SQLite/PostgreSQL)
└─ POSTGRES_PASSWORD → DB admin password (Docker only)

Encryption & Security
├─ ENCRYPTION_KEY → Fernet key for secrets
├─ JWT_SECRET_KEY → Token signing key
└─ SECRET_KEY → General secret (legacy)

Application URLs
├─ ALLOWED_ORIGINS → CORS whitelist
├─ FRONTEND_URL → Frontend domain
└─ BACKEND_URL → API domain

Email Configuration (Optional)
├─ SMTP_SERVER → Email provider
├─ SMTP_PORT → Email port (587 or 465)
├─ SMTP_USER → Email account
└─ SMTP_PASSWORD → Email password

OIDC/SSO Configuration (Optional)
├─ OIDC_CLIENT_ID → OAuth client ID
├─ OIDC_CLIENT_SECRET → OAuth secret
└─ OIDC_PROVIDER_URL → Provider endpoint
```

### Configuration Loading Priority

```
1. Environment Variables (.env file)
   └─ Read by python-dotenv

2. Docker Environment (--env-file)
   └─ Passed to containers

3. Defaults (Hardcoded)
   └─ Fallback values in code

4. System Environment
   └─ OS environment variables (override all)
```

---

## 📊 Scalability Considerations

### Current Design (100-1000 users)

```
✅ Single Database Instance
✅ Single Backend Instance
✅ Frontend served statically
✅ In-memory rate limiting
✅ File-based logging
```

### For 1000-10,000 Users

```
Consider Adding:
├─ Database connection pooling
├─ Redis for caching/sessions
├─ Load balancing (multiple backend instances)
├─ CDN for static assets
├─ Structured logging (ELK, Datadog, etc.)
└─ Database query optimization
```

### For 10,000+ Users

```
Enterprise Setup:
├─ Database replication (primary-replica)
├─ Redis cluster for caching
├─ API gateway (Kong, Traefik)
├─ Kubernetes orchestration
├─ Distributed tracing
├─ Metrics & monitoring (Prometheus, Grafana)
└─ Dedicated backup infrastructure
```

---

## 🎯 Design Principles

### 1. Modularity
- Each router handles one domain (auth, users, applications, admin)
- CRUD operations isolated in crud.py
- Models define data structure
- Schemas define validation

### 2. Security First
- Encryption by default (Fernet for secrets)
- Strong password hashing (Argon2)
- Rate limiting on auth endpoints
- Audit logging for compliance
- CORS enforced

### 3. Maintainability
- Clear separation of concerns
- Type hints throughout
- Comprehensive documentation
- Consistent naming conventions
- DRY principles followed

### 4. Scalability
- Stateless backend (can be load-balanced)
- Database abstraction (easy to scale)
- Configurable via environment variables
- Container-ready (Docker)

### 5. Testability
- Dependency injection with FastAPI
- In-memory database for tests
- Isolated test fixtures
- Comprehensive test markers

---

## 🚦 API Design Standards

### RESTful Endpoints

```
Authentication:
├─ POST /api/auth/register → Create user
├─ POST /api/auth/login → Login
├─ POST /api/auth/logout → Logout
├─ POST /api/auth/refresh → Refresh token
└─ POST /api/auth/password-reset → Password recovery

Users:
├─ GET /api/users/me → Current user profile
├─ PUT /api/users/me → Update profile
├─ DELETE /api/users/me → Delete account
└─ GET /api/users/{id}/applications → User's 2FA apps

Applications (2FA):
├─ GET /api/applications → List all
├─ POST /api/applications → Create
├─ GET /api/applications/{id} → Get details
├─ PUT /api/applications/{id} → Update
├─ DELETE /api/applications/{id} → Delete
└─ POST /api/applications/{id}/verify → Verify TOTP

Administration:
├─ GET /api/admin/users → List all users (admin)
├─ DELETE /api/admin/users/{id} → Delete user (admin)
├─ GET /api/admin/settings → Get global settings
├─ PUT /api/admin/settings → Update settings (admin)
└─ GET /api/admin/audit-logs → View audit logs (admin)

Health:
└─ GET /health → Application health status
```

### Response Format

```json
Success (200):
{
  "data": { ... },
  "status": "success"
}

Error (4xx/5xx):
{
  "detail": "Error message",
  "status": "error",
  "code": "ERROR_CODE"
}

Token Response:
{
  "access_token": "jwt...",
  "token_type": "bearer",
  "expires_in": 2592000
}
```

---

## 🔐 Error Handling Strategy

### Exception Hierarchy

```
HTTPException
├─ 400 Bad Request
│  └─ Invalid input (Pydantic validation)
│
├─ 401 Unauthorized
│  ├─ Missing token
│  ├─ Invalid token
│  └─ Token expired
│
├─ 403 Forbidden
│  ├─ Insufficient permissions
│  └─ Rate limited
│
├─ 404 Not Found
│  └─ Resource not found
│
├─ 409 Conflict
│  ├─ Duplicate email
│  └─ Duplicate username
│
└─ 500 Internal Server Error
   └─ Unhandled exceptions
```

### Error Logging

```
Errors logged to:
├─ Console (development)
├─ Structured logs (production)
├─ Error tracking (optional: Sentry)
└─ Audit trail (for security events)
```

---

## 📚 References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Status:** ✅ Production-Grade Architecture  
**Last Updated:** December 30, 2025
