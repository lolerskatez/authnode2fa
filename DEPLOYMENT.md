# Deployment Guide

Complete instructions for deploying authnode2fa in all environments.

## Quick Navigation

- **Just want to deploy?** → Jump to [Production Deployment](#production-docker-recommended)
- **Local development?** → Jump to [Local Development](#local-development)
- **Security checklist?** → See [SECURITY.md](SECURITY.md)
- **Need help?** → Jump to [Troubleshooting](#troubleshooting)

---

## Production Deployment (Docker - Recommended)

### Prerequisites

- Linux server (Ubuntu 20.04+, Debian 11+, or similar)
- Docker and Docker Compose installed
- Domain name configured
- 2GB RAM minimum (4GB+ recommended)
- 10GB disk space minimum

### Step 1: Server Preparation

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone Repository

```bash
# Choose a deployment directory
mkdir -p /opt/authnode2fa
cd /opt/authnode2fa

# Clone repository
git clone https://github.com/lolerskatez/authnode2fa.git .
```

### Step 3: Configure Environment

```bash
# Copy production template
cp .env.docker.example .env.docker

# Edit with your settings
nano .env.docker
```

**Required configuration:**

```bash
# 1. Generate encryption key
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
# Copy output to: ENCRYPTION_KEY=...

# 2. Generate database password
openssl rand -base64 32
# Copy output to: POSTGRES_PASSWORD=...

# 3. Set your domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api

# 4. Optional: Configure OIDC
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_PROVIDER_URL=https://your-oidc-provider
```

### Step 4: Deploy

```bash
# Start all services
docker-compose --env-file .env.docker up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f backend
```

### Step 5: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update nginx config with certificate paths
# Edit docker-compose.yml to mount certificates
```

### Step 6: Access Application

Visit:
- **Frontend**: `https://yourdomain.com`
- **API Docs**: `https://yourdomain.com/api/docs`
- **Default admin**: `admin@example.com` / auto-generated (check logs)

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
