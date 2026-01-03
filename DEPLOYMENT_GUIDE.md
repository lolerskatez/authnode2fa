# AuthNode 2FA - Production Deployment Guide

## 🚀 Quick Start (Fresh Deployment)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose V2
- Domain name (optional, but recommended for HTTPS)
- 1GB+ RAM, 10GB+ disk space

---

## 📦 Deployment Steps

### 1. Clone or Download Repository
```bash
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.prod.example .env.prod

# Edit with your favorite editor
nano .env.prod
```

**Required Changes:**
- `POSTGRES_PASSWORD` - Strong database password
- `SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `REDIS_PASSWORD` - Generate with: `openssl rand -hex 32`
- `APP_URL` - Your domain (e.g., https://yourdomain.com)

**Optional (Auto-generated if not set):**
- `ENCRYPTION_KEY` - Auto-generated and persisted in Docker volume

### 3. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 4. Access the Application
- **Frontend:** http://your-server-ip:80
- **API Docs:** http://your-server-ip:80/api/docs
- **Health Check:** http://your-server-ip:80/api/health

### 5. Login with Default Admin
```
Email: admin@example.com
Password: changeme123
```

**⚠️ IMPORTANT:** Change the admin password immediately after first login!

---

## 🔒 Security Hardening

### Change Admin Password
1. Login as admin
2. Go to Settings → Account → Change Password
3. Use a strong, unique password (16+ characters)

### Enable HTTPS (Recommended)
Use a reverse proxy like Caddy or Nginx with Let's Encrypt:

```bash
# Example with Caddy (easiest)
docker run -d \
  --name caddy \
  --network authnode2fa_authnode2fa_network \
  -p 80:80 -p 443:443 \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:latest \
  caddy reverse-proxy --from https://yourdomain.com --to frontend:80
```

### Configure Firewall
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Block direct database access
sudo ufw deny 5432/tcp
sudo ufw deny 6379/tcp
```

---

## 🛠️ Management Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f db
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop/Start
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml stop

# Start all services
docker-compose -f docker-compose.prod.yml start

# Stop and remove containers (data preserved in volumes)
docker-compose -f docker-compose.prod.yml down
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 💾 Backup & Restore

### Backup Database
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db \
  pg_dump -U authnode2fa_user authnode2fa_prod > backup_$(date +%Y%m%d).sql

# Or use the backup script
./scripts/backup.sh
```

### Restore Database
```bash
# Restore from backup
cat backup_20260102.sql | docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U authnode2fa_user authnode2fa_prod
```

### Backup Encryption Key
```bash
# The encryption key is stored in a Docker volume
# To backup, copy from the container
docker-compose -f docker-compose.prod.yml exec backend \
  cat /app/backend/.encryption_key > encryption_key_backup.txt

# Store this file securely - without it, encrypted data cannot be decrypted!
```

---

## 📊 Monitoring

### Health Checks
```bash
# Check all services health
docker-compose -f docker-compose.prod.yml ps

# API health endpoint
curl http://localhost:80/api/health
```

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df
```

---

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check logs for errors
docker-compose -f docker-compose.prod.yml logs

# Verify environment variables
docker-compose -f docker-compose.prod.yml config

# Check if ports are already in use
sudo netstat -tulpn | grep -E ':(80|443|5432|6379)'
```

### Database Connection Errors
```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Verify connection inside backend container
docker-compose -f docker-compose.prod.yml exec backend \
  python -c "from app.database import engine; engine.connect()"
```

### Permission Denied Errors
```bash
# Fix ownership of mounted volumes
sudo chown -R 1000:1000 ./logs
sudo chown -R 1000:1000 ./backend
```

### Reset Everything (DESTRUCTIVE)
```bash
# Stop and remove all containers, volumes, networks
docker-compose -f docker-compose.prod.yml down -v

# Remove all images
docker-compose -f docker-compose.prod.yml down --rmi all

# Start fresh
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📈 Performance Tuning

### Database Optimization
Edit `docker-compose.prod.yml` and add to db service:
```yaml
command:
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "max_connections=200"
```

### Backend Workers
Adjust workers in `backend/Dockerfile.prod`:
```dockerfile
# For 1GB RAM: 2-4 workers
# For 2GB RAM: 4-6 workers
# For 4GB+ RAM: 6-8 workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8041", "--workers", "4"]
```

---

## 🔐 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | ✅ Yes | - | PostgreSQL password |
| `SECRET_KEY` | ✅ Yes | - | JWT signing key |
| `REDIS_PASSWORD` | ✅ Yes | - | Redis password |
| `ENCRYPTION_KEY` | ❌ No | Auto-generated | Fernet encryption key |
| `APP_URL` | ❌ No | https://yourdomain.com | Application URL |
| `SMTP_ENABLED` | ❌ No | false | Enable email notifications |
| `MAX_FAILED_LOGIN_ATTEMPTS` | ❌ No | 5 | Account lockout threshold |
| `ACCOUNT_LOCKOUT_MINUTES` | ❌ No | 15 | Lockout duration |

---

## 📞 Support

- **Documentation:** Check README.md files
- **Issues:** GitHub Issues
- **Logs:** Always check logs first: `docker-compose logs -f`

---

## ✅ Post-Deployment Checklist

- [ ] Changed default admin password
- [ ] Configured HTTPS/SSL
- [ ] Set up automated backups
- [ ] Configured firewall rules
- [ ] Tested login and 2FA functionality
- [ ] Set up monitoring/alerts
- [ ] Documented custom configuration
- [ ] Tested backup restoration
- [ ] Secured .env.prod file (chmod 600)
- [ ] Disabled debug/adminer service in production

---

**Production Ready!** 🎉

Your AuthNode 2FA instance is now deployed and ready for use.
