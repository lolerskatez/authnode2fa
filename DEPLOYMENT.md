# Production Deployment Guide

## Quick Start

### Prerequisites
- Docker & Docker Compose (latest versions)
- A domain name pointing to your server
- SSL certificate (recommended: use Let's Encrypt)

### 1. Clone and Configure

```bash
git clone https://github.com/yourusername/authnode2fa.git
cd authnode2fa

# Copy and configure environment
cp .env.docker.example .env.docker
nano .env.docker  # Edit with your production values
```

### 2. Generate Required Secrets

```bash
# Generate encryption key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Generate secure database password
openssl rand -base64 32
```

### 3. Deploy with Docker Compose

```bash
# Start the application
docker-compose --env-file .env.docker up -d

# Check logs
docker-compose logs -f backend

# Access the application
# Frontend: https://yourdomain.com
# API: https://yourdomain.com/api/docs
```

### 4. Configure Nginx/Reverse Proxy (if needed)

The included docker-compose already includes nginx. For external reverse proxy (HAProxy, Traefik, etc.):

```
Proxy /api/* -> http://backend:8041
Proxy /* -> http://frontend:80
```

### 5. Database Migrations

Migrations run automatically on backend startup. To verify:

```bash
docker-compose exec backend python -m alembic upgrade head
```

## Security Checklist

- [ ] Changed all default passwords in `.env.docker`
- [ ] Generated new `ENCRYPTION_KEY`
- [ ] Set up SSL/TLS certificate
- [ ] Configured CORS `ALLOWED_ORIGINS` for your domain
- [ ] Set up SMTP for email notifications
- [ ] Enabled OIDC if using SSO
- [ ] Backed up PostgreSQL data volume
- [ ] Set up log rotation
- [ ] Configured database backups

## Monitoring

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend

# Monitor database
docker-compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB
```

## Backup Strategy

```bash
# Backup database
docker-compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Backup volumes
docker run --rm -v authnode2fa_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz /data
```

## Updates

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose --env-file .env.docker up -d --build

# Check migrations applied
docker-compose logs backend | grep alembic
```

## Troubleshooting

### Database connection issues
```bash
docker-compose exec backend python -c "from app.database import engine; print('✓ DB OK')"
```

### Frontend not loading
```bash
docker-compose logs frontend
docker-compose exec frontend nginx -t
```

### API not responding
```bash
docker-compose exec backend curl http://localhost:8041/api/docs
```

## Support

For issues, check logs:
```bash
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend
docker-compose logs --tail=100 db
```
