# Pre-Deployment Checklist

Complete this checklist before deploying to production.

## 🔐 Security Configuration

- [ ] **Encryption Key**
  - [ ] Generated new encryption key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
  - [ ] Added to `.env.docker` as `ENCRYPTION_KEY`
  - [ ] Backed up in secure location (password manager, vault, etc.)

- [ ] **Database Credentials**
  - [ ] Generated secure password: `openssl rand -base64 32` or similar
  - [ ] Set `POSTGRES_PASSWORD` in `.env.docker`
  - [ ] Confirmed NOT in any version control
  - [ ] Stored in production secrets management system

- [ ] **CORS Configuration**
  - [ ] Updated `ALLOWED_ORIGINS` with your domain(s)
  - [ ] Format: `https://yourdomain.com,https://www.yourdomain.com`
  - [ ] HTTPS only for production

- [ ] **OIDC/SSO (if using)**
  - [ ] Generated OIDC client credentials
  - [ ] Set `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`
  - [ ] Set `OIDC_ISSUER_URL`
  - [ ] Configured callback URL in OIDC provider

- [ ] **SMTP Email (if using)**
  - [ ] Configured email server
  - [ ] Set `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - [ ] Tested email delivery
  - [ ] Verified sender email domain

## 🐳 Docker Configuration

- [ ] **Docker Images**
  - [ ] Built and tested locally: `docker-compose build`
  - [ ] No build errors or warnings
  - [ ] Image sizes acceptable

- [ ] **docker-compose.yml**
  - [ ] PostgreSQL service configured correctly
  - [ ] Backend service configured with proper ports
  - [ ] Frontend service configured with proper ports
  - [ ] All environment variables externalized to `.env.docker`

- [ ] **Environment File**
  - [ ] Created `.env.docker` from `.env.docker.example`
  - [ ] All variables filled with production values
  - [ ] File is NOT in version control (check `.gitignore`)
  - [ ] Backup created in secure location

## 📊 Database Configuration

- [ ] **PostgreSQL Setup**
  - [ ] PostgreSQL version 12+ confirmed
  - [ ] Database created: `authy`
  - [ ] Database user configured with proper permissions
  - [ ] Backups configured and tested

- [ ] **Database Migrations**
  - [ ] All migrations reviewed and understood
  - [ ] Alembic history verified: `alembic current`
  - [ ] Migration rollback tested (if possible)

- [ ] **Backup & Recovery**
  - [ ] Backup script created: `docker-compose exec db pg_dump -U user -d authy > backup.sql`
  - [ ] Test restore process documented
  - [ ] Backup location configured (cloud storage, etc.)
  - [ ] Backup schedule set (daily/weekly)

## 🌐 SSL/TLS Certificate

- [ ] **HTTPS Setup**
  - [ ] SSL certificate obtained (Let's Encrypt, commercial, etc.)
  - [ ] Certificate placed at proper location
  - [ ] Nginx/reverse proxy configured for HTTPS
  - [ ] HTTP redirects to HTTPS configured
  - [ ] Certificate auto-renewal set up

- [ ] **Certificate Validation**
  - [ ] Certificate validity checked: `openssl x509 -in cert.pem -text -noout`
  - [ ] Certificate chain validated
  - [ ] Certificate renewal date set in calendar

## 🚀 Deployment Infrastructure

- [ ] **Server Preparation**
  - [ ] Linux server provisioned (Ubuntu 20.04+ recommended)
  - [ ] Docker installed: `docker --version`
  - [ ] Docker Compose installed: `docker-compose --version`
  - [ ] Git installed for code updates
  - [ ] SSH key access configured

- [ ] **Firewall & Networking**
  - [ ] Firewall configured for ports 80/443
  - [ ] Application ports (8040, 8041) internal only
  - [ ] Database port (5432) not exposed to internet
  - [ ] SSH port (22) restricted to known IPs

- [ ] **Reverse Proxy**
  - [ ] Nginx/Traefik/HAProxy configured
  - [ ] Proxy rules for `/api/*` → backend:8041
  - [ ] Proxy rules for `/` → frontend:80
  - [ ] Health check endpoint configured: `/health`

## 🔍 Health & Monitoring

- [ ] **Health Checks**
  - [ ] Backend health endpoint tested: `curl https://yourdomain.com/health`
  - [ ] Frontend responding: `curl https://yourdomain.com`
  - [ ] API docs available: `https://yourdomain.com/api/docs`

- [ ] **Logging**
  - [ ] Application logs configured
  - [ ] Log rotation set up
  - [ ] Log directory created: `/var/log/authnode2fa/`
  - [ ] Logs being captured by Docker

- [ ] **Monitoring**
  - [ ] Uptime monitoring configured (UptimeRobot, etc.)
  - [ ] Error tracking configured (Sentry, etc.)
  - [ ] Performance metrics configured (Prometheus, etc.)
  - [ ] Alerts configured for critical issues

## 👥 User Management

- [ ] **Default Admin Account**
  - [ ] Admin user created automatically by entrypoint
  - [ ] Default password changed immediately after first login
  - [ ] Admin account secured with strong password

- [ ] **User Features**
  - [ ] Signup enabled/disabled per configuration
  - [ ] Email verification working (if enabled)
  - [ ] Password reset working
  - [ ] User role assignment working

## ✅ Testing & Validation

- [ ] **Functional Testing**
  - [ ] [ ] User can sign up (if enabled)
  - [ ] [ ] User can log in
  - [ ] [ ] QR code upload works
  - [ ] [ ] TOTP code generation works
  - [ ] [ ] 2FA codes display correctly
  - [ ] [ ] Account management (add/edit/delete) works
  - [ ] [ ] Categories and favorites work

- [ ] **API Testing**
  - [ ] [ ] Swagger UI accessible at `/api/docs`
  - [ ] [ ] All endpoints responding correctly
  - [ ] [ ] CORS headers present on responses
  - [ ] [ ] Authentication required for protected endpoints
  - [ ] [ ] Invalid requests properly rejected

- [ ] **Security Testing**
  - [ ] [ ] SQL injection attempts blocked
  - [ ] [ ] CSRF protection working
  - [ ] [ ] Rate limiting configured (if needed)
  - [ ] [ ] Authentication bypass attempts prevented
  - [ ] [ ] Secrets not exposed in logs

- [ ] **Performance Testing**
  - [ ] [ ] Frontend loads in < 3 seconds
  - [ ] [ ] API responses in < 200ms
  - [ ] [ ] Database queries optimized
  - [ ] [ ] No N+1 query problems

## 📝 Documentation

- [ ] **Deployment Documentation**
  - [ ] Deployed successfully with DEPLOYMENT.md steps
  - [ ] Any deviations documented
  - [ ] Team members trained on processes

- [ ] **Operational Runbooks**
  - [ ] How to restart services documented
  - [ ] How to view logs documented
  - [ ] How to backup/restore documented
  - [ ] How to handle incidents documented
  - [ ] Emergency contact list created

## 🔄 Maintenance Plan

- [ ] **Regular Updates**
  - [ ] Dependency update schedule established
  - [ ] Security patch process documented
  - [ ] Update testing procedure documented

- [ ] **Backup Schedule**
  - [ ] Daily backups enabled
  - [ ] Weekly full backups verified
  - [ ] Monthly backup restoration test scheduled

- [ ] **Monitoring Schedule**
  - [ ] Daily check of error logs
  - [ ] Weekly performance review
  - [ ] Monthly security audit

## 🎯 Final Steps

- [ ] **Pre-Launch Review**
  - [ ] All checklist items completed
  - [ ] Team review completed
  - [ ] Stakeholder sign-off obtained
  - [ ] Rollback plan reviewed and ready

- [ ] **Launch**
  - [ ] Backup current state
  - [ ] Deploy to production
  - [ ] Monitor closely for first 24 hours
  - [ ] Alert team on launch completion

- [ ] **Post-Launch**
  - [ ] Monitor error rates and performance
  - [ ] Gather user feedback
  - [ ] Plan next improvements
  - [ ] Schedule post-deployment retrospective

---

## Deployment Commands

### Quick Deploy Checklist

```bash
# 1. Clone repository (if not already done)
git clone https://github.com/lolerskatez/authnode2fa.git
cd authnode2fa

# 2. Prepare environment
cp .env.docker.example .env.docker
# Edit .env.docker with production values
nano .env.docker

# 3. Build images
docker-compose build

# 4. Start services
docker-compose --env-file .env.docker up -d

# 5. Verify health
curl http://localhost:8041/health
curl http://localhost:8040

# 6. Check logs
docker-compose logs -f backend

# 7. Backup database
docker-compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%Y%m%d).sql

# 8. Test features
# Open browser and test at http://localhost:8040 (or your domain)
```

---

**Date Completed:** _______________

**Deployment Date:** _______________

**Deployed By:** _______________

**Verified By:** _______________

**Notes:** ________________________________________________________________________

