# Backend - FastAPI 2FA Manager

## Structure

```
backend/
├── app/                      # Core application package
│   ├── __init__.py          # Package initialization
│   ├── main.py              # FastAPI application setup
│   ├── auth.py              # Authentication logic
│   ├── database.py          # Database configuration
│   ├── crud.py              # Database operations
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── utils.py             # Utility functions
│   └── routers/             # API endpoint routers
│       ├── auth.py          # Authentication endpoints
│       ├── users.py         # User management endpoints
│       ├── applications.py  # 2FA application endpoints
│       └── admin.py         # Admin panel endpoints
├── alembic/                 # Database migration management
│   ├── env.py              # Migration environment
│   └── versions/           # Migration files (001-008)
├── Dockerfile              # Container image definition
├── entrypoint.sh           # Docker startup script
├── requirements.txt        # Python dependencies
├── run_server.py           # Local development server
├── setup_local.py          # Local development setup
├── create_test_user.py     # Test user creation utility
├── alembic.ini             # Alembic configuration
└── .env                    # Environment variables (local dev)
```

## Running Locally

### Setup
```bash
# Windows
./setup_local.bat

# Linux/Mac
./setup_local.sh
```

This will:
- ✅ Create Python virtual environment
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Create test user (test@example.com / password123)

### Start Server
```bash
python run_server.py
```

Server runs at: `http://localhost:8041`
API docs at: `http://localhost:8041/api/docs`

## Docker Deployment

### Build
```bash
docker build -t authnode2fa-backend .
```

### Run
```bash
docker run -e DATABASE_URL=postgresql://... \
           -e ENCRYPTION_KEY=... \
           -p 8041:8041 \
           authnode2fa-backend
```

The `entrypoint.sh` automatically:
- ✅ Waits for PostgreSQL
- ✅ Runs migrations
- ✅ Creates admin user if needed
- ✅ Starts uvicorn server

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path (local) or PostgreSQL URL (production) |
| `ENCRYPTION_KEY` | Yes | Fernet encryption key for secret storage |
| `ALLOWED_ORIGINS` | No | CORS origins (default: http://localhost:8040) |
| `OIDC_CLIENT_ID` | No | OpenID Connect client ID |
| `OIDC_CLIENT_SECRET` | No | OpenID Connect client secret |
| `OIDC_PROVIDER_URL` | No | OpenID Connect provider URL |
| `SMTP_SERVER` | No | SMTP server for email notifications |
| `SMTP_PORT` | No | SMTP port (default: 587) |

See `.env.example` for all options.

## API Routes

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout

### Users
- `GET /users/me` - Get current user
- `PUT /users/me` - Update profile
- `DELETE /users/me` - Delete account

### Applications
- `GET /applications` - List 2FA applications
- `POST /applications` - Add new application
- `PUT /applications/{id}` - Update application
- `DELETE /applications/{id}` - Delete application

### Admin
- `GET /admin/users` - List all users (admin only)
- `DELETE /admin/users/{id}` - Delete user (admin only)
- `GET /admin/settings` - Get global settings
- `PUT /admin/settings` - Update global settings

### Health
- `GET /health` - Health check with DB connectivity

Full API documentation: `http://localhost:8041/api/docs`

## Database Migrations

Migrations are in `alembic/versions/`:
1. **001_initial.py** - Core schema
2. **002_add_app_icon.py** - Application icons
3. **003_add_category_and_favorite.py** - Categories and favorites
4. **004_add_color_column.py** - Custom colors
5. **005_add_settings_column.py** - User settings
6. **006_add_global_settings.py** - Global configuration
7. **007_add_sso_support.py** - SSO authentication
8. **008_add_signup_enabled.py** - Sign-up configuration

### Running Migrations
```bash
# Upgrade to latest
python -m alembic upgrade head

# Downgrade one revision
python -m alembic downgrade -1

# View current revision
python -m alembic current
```

## Dependencies

Core frameworks:
- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **Alembic** - Migrations
- **Pydantic** - Data validation

Security:
- **cryptography** - Encryption
- **passlib** - Password hashing
- **argon2-cffi** - Hash algorithm
- **python-jose** - JWT handling

Features:
- **pyotp** - TOTP generation
- **pyzbar** - QR code reading
- **pillow** - Image processing
- **authlib** - OIDC/OAuth
- **aiosmtplib** - Email sending

See `requirements.txt` for full list with versions.

## Development

### Add Migration
```bash
alembic revision --autogenerate -m "description"
```

### Add Dependency
```bash
pip install package_name
pip freeze > requirements.txt
```

### Run Tests
```bash
# Unit tests
pytest app/tests/ -v

# With coverage
pytest --cov=app app/tests/
```

## Troubleshooting

### Database connection error
```bash
python -c "from app.database import engine; engine.connect()"
```

### Import errors
```bash
pip install -r requirements.txt
```

### Migration issues
```bash
# Check current state
alembic current

# View history
alembic history

# Downgrade and retry
alembic downgrade -1
alembic upgrade head
```

## Production Checklist

- ✅ All dependencies pinned with versions
- ✅ Database migrations automated
- ✅ Health checks implemented
- ✅ CORS configurable
- ✅ Secrets in environment variables
- ✅ Docker entrypoint handles setup
- ✅ Error handling and logging
- ✅ API documentation generated

## Code Quality

- **Framework**: FastAPI with auto-documentation
- **Database**: SQLAlchemy ORM with type hints
- **Validation**: Pydantic schemas
- **Security**: Encrypted secrets, CORS, rate-limiting ready
- **Monitoring**: Health endpoint, structured logging

---

**For deployment instructions, see [../DEPLOYMENT.md](../DEPLOYMENT.md)**
