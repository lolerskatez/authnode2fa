# Quick Start Guide - Production Deployment

Deploy authnode2fa to production in 10 minutes.

## Prerequisites

- [ ] Linux server (Ubuntu 20.04+) with root/sudo access
- [ ] Docker and Docker Compose installed
- [ ] Domain name pointing to the server
- [ ] SSL certificate (use Let's Encrypt for free)

## Step 1: Clone Repository (2 min)

```bash
# SSH into your server
ssh root@your-server-ip

# Clone the repository
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# Create a production environment file
cp .env.docker.example .env.docker
```

## Step 2: Configure Environment (3 min)

```bash
# Edit the environment file
nano .env.docker
```

**Must configure:**

```bash
# Generate a new encryption key
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

# Generate a database password
openssl rand -base64 32

# Update these in .env.docker:
POSTGRES_PASSWORD=your-generated-secure-password-here
ENCRYPTION_KEY=your-generated-encryption-key
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional but recommended:
OIDC_CLIENT_ID=your-oidc-client-id
OIDC_CLIENT_SECRET=your-oidc-client-secret
OIDC_ISSUER_URL=https://your-oidc-provider

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

## Step 3: Build and Start (3 min)

```bash
# Build Docker images
docker-compose build

# Start the application (runs in background)
docker-compose --env-file .env.docker up -d

# Watch the logs (Ctrl+C to exit)
docker-compose logs -f backend
```

Look for: `Application startup complete.` - means backend is ready!

## Step 4: Configure Reverse Proxy (2 min)

If using Nginx (recommended):

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/authnode2fa

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:8040;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:8041;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/authnode2fa /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 5: Setup SSL Certificate (requires Certbot)

```bash
# Install Certbot (if not already installed)
sudo apt-get install certbot python3-certbot-nginx -y

# Generate free SSL certificate with Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts - it will auto-update your Nginx config for HTTPS!

# Auto-renewal is automatic
```

## Step 6: Verify Deployment

```bash
# Check if all containers are running
docker-compose ps

# Test the API health endpoint
curl https://yourdomain.com/health

# Test the frontend
curl https://yourdomain.com

# View live logs
docker-compose logs -f

# Check database connection
docker-compose exec backend python -c "from app.database import SessionLocal; SessionLocal(); print('Database OK')"
```

## Step 7: First Login

1. Open `https://yourdomain.com` in your browser
2. Default admin user: `admin@example.com`
3. Default password: `changeme123`
4. **CHANGE THIS PASSWORD IMMEDIATELY!**

## Backup Your Data

```bash
# Create a database backup
docker-compose exec db pg_dump -U ${POSTGRES_USER:-user} ${POSTGRES_DB:-authy} > backup-$(date +%Y%m%d-%H%M%S).sql

# Download the backup to your local machine
scp root@your-server-ip:backup-*.sql ./
```

## Restart Services

```bash
# Stop all services
docker-compose stop

# Start all services
docker-compose start

# Restart everything
docker-compose restart

# Rebuild after code changes
docker-compose --env-file .env.docker up -d --build
```

## Monitor Logs

```bash
# View last 100 lines of backend logs
docker-compose logs --tail=100 backend

# View last 100 lines of frontend logs
docker-compose logs --tail=100 frontend

# View database logs
docker-compose logs --tail=100 db

# Follow logs in real-time
docker-compose logs -f
```

## Troubleshooting

### Backend not starting?
```bash
docker-compose logs backend
# Check for database connection errors or migration issues
```

### Frontend blank page?
```bash
docker-compose logs frontend
# Check Nginx configuration
```

### Database errors?
```bash
docker-compose exec db psql -U ${POSTGRES_USER:-user} -d ${POSTGRES_DB:-authy} -c "SELECT 1;"
```

### Port already in use?
```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :8040
sudo lsof -i :8041
```

## Daily Operations

### Check system health
```bash
docker-compose ps
curl https://yourdomain.com/health
```

### View errors
```bash
docker-compose logs --tail=50 | grep -i error
```

### Update the application
```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### Backup database (daily)
```bash
docker-compose exec db pg_dump -U ${POSTGRES_USER:-user} ${POSTGRES_DB:-authy} > /backups/authy-$(date +%Y%m%d).sql
```

## Need Help?

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed information
2. Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for complete checklist
3. Check logs: `docker-compose logs -f`
4. Review README.md for features and configuration

---

**That's it! Your authnode2fa is now running in production!** 🎉

Remember to:
- Change the default admin password
- Backup your database regularly
- Keep Docker images updated
- Monitor the application logs
