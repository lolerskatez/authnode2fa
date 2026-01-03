#!/bin/bash
# AuthNode 2FA - Interactive Production Setup
# Auto-generates secure secrets and creates .env.prod

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║           AuthNode 2FA Setup Wizard                 ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}Welcome!${NC} This wizard will set up your production environment."
echo ""
echo "We'll auto-generate secure passwords and keys for you."
echo "You only need to provide your domain and optional SMTP settings."
echo ""
read -p "Press Enter to continue..."
clear

# Check if .env.prod already exists
if [ -f ".env.prod" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env.prod already exists!${NC}"
    echo ""
    read -p "Do you want to overwrite it? (yes/no): " overwrite
    if [ "$overwrite" != "yes" ]; then
        echo "Setup cancelled. Your existing .env.prod is safe."
        exit 0
    fi
    echo ""
fi

echo -e "${BLUE}Step 1/5: Database Configuration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo -e "${GREEN}✓${NC} Auto-generated secure database password"

# Database name
read -p "Database name [authnode2fa_prod]: " DB_NAME
DB_NAME=${DB_NAME:-authnode2fa_prod}

# Database user
read -p "Database user [authnode2fa_user]: " DB_USER
DB_USER=${DB_USER:-authnode2fa_user}

echo ""
echo -e "${BLUE}Step 2/5: Security Keys${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✓${NC} Auto-generated SECRET_KEY (64 characters)"

# Generate REDIS_PASSWORD
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo -e "${GREEN}✓${NC} Auto-generated Redis password"

# Encryption key (optional, will auto-generate if not set)
echo ""
echo "Encryption key for OTP secrets:"
echo "  - Leave empty to auto-generate on first run (recommended)"
echo "  - Or provide your own Fernet key"
read -p "Encryption key [auto-generate]: " ENCRYPTION_KEY

echo ""
echo -e "${BLUE}Step 3/5: Application Settings${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Domain/URL
read -p "Your domain (e.g., 2fa.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    APP_URL="http://localhost"
    echo -e "${YELLOW}⚠️${NC}  No domain provided, using: $APP_URL"
else
    # Ask about HTTPS
    read -p "Use HTTPS? (yes/no) [yes]: " USE_HTTPS
    USE_HTTPS=${USE_HTTPS:-yes}
    
    if [ "$USE_HTTPS" = "yes" ]; then
        APP_URL="https://$DOMAIN"
    else
        APP_URL="http://$DOMAIN"
    fi
fi

echo -e "${GREEN}✓${NC} Application URL set to: $APP_URL"

echo ""
echo -e "${BLUE}Step 4/5: Email/SMTP Configuration (Optional)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "SMTP enables email notifications for password resets."
read -p "Enable SMTP? (yes/no) [no]: " ENABLE_SMTP
ENABLE_SMTP=${ENABLE_SMTP:-no}

if [ "$ENABLE_SMTP" = "yes" ]; then
    read -p "SMTP Host (e.g., smtp.gmail.com): " SMTP_HOST
    read -p "SMTP Port [587]: " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "SMTP Username: " SMTP_USERNAME
    read -sp "SMTP Password: " SMTP_PASSWORD
    echo ""
    read -p "From Email (e.g., noreply@yourdomain.com): " SMTP_FROM_EMAIL
    read -p "From Name [AuthNode 2FA]: " SMTP_FROM_NAME
    SMTP_FROM_NAME=${SMTP_FROM_NAME:-AuthNode 2FA}
    SMTP_ENABLED="true"
else
    SMTP_ENABLED="false"
    SMTP_HOST=""
    SMTP_PORT="587"
    SMTP_USERNAME=""
    SMTP_PASSWORD=""
    SMTP_FROM_EMAIL=""
    SMTP_FROM_NAME="AuthNode 2FA"
fi

echo ""
echo -e "${BLUE}Step 5/5: Security Settings${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Max failed login attempts [5]: " MAX_FAILED_LOGINS
MAX_FAILED_LOGINS=${MAX_FAILED_LOGINS:-5}

read -p "Account lockout duration (minutes) [15]: " LOCKOUT_MINUTES
LOCKOUT_MINUTES=${LOCKOUT_MINUTES:-15}

read -p "Login rate limit (per minute) [5]: " LOGIN_RATE_LIMIT
LOGIN_RATE_LIMIT=${LOGIN_RATE_LIMIT:-5}

# Generate .env.prod file
echo ""
echo -e "${BLUE}Generating configuration file...${NC}"
echo ""

cat > .env.prod << EOF
# ==========================================
# AuthNode 2FA Production Configuration
# Generated: $(date)
# ==========================================

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# ==========================================
# SECURITY KEYS
# ==========================================
SECRET_KEY=$SECRET_KEY
REDIS_PASSWORD=$REDIS_PASSWORD

EOF

# Add encryption key only if provided
if [ ! -z "$ENCRYPTION_KEY" ]; then
    echo "# Encryption key for OTP secrets" >> .env.prod
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.prod
else
    echo "# Encryption key - auto-generated on first run" >> .env.prod
    echo "# ENCRYPTION_KEY=" >> .env.prod
fi

cat >> .env.prod << EOF

# ==========================================
# APPLICATION CONFIGURATION
# ==========================================
APP_ENV=production
APP_URL=$APP_URL

# ==========================================
# EMAIL/SMTP CONFIGURATION
# ==========================================
SMTP_ENABLED=$SMTP_ENABLED
EOF

if [ "$SMTP_ENABLED" = "true" ]; then
    cat >> .env.prod << EOF
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USERNAME=$SMTP_USERNAME
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM_EMAIL=$SMTP_FROM_EMAIL
SMTP_FROM_NAME=$SMTP_FROM_NAME
EOF
else
    cat >> .env.prod << EOF
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=AuthNode 2FA
EOF
fi

cat >> .env.prod << EOF

# ==========================================
# RATE LIMITING CONFIGURATION
# ==========================================
LOGIN_RATE_LIMIT=${LOGIN_RATE_LIMIT}/minute
SIGNUP_RATE_LIMIT=3/minute
TOTP_VERIFY_RATE_LIMIT=10/minute
API_RATE_LIMIT=100/minute
SENSITIVE_API_RATE_LIMIT=30/minute

# ==========================================
# SECURITY SETTINGS
# ==========================================
MAX_FAILED_LOGIN_ATTEMPTS=$MAX_FAILED_LOGINS
ACCOUNT_LOCKOUT_MINUTES=$LOCKOUT_MINUTES

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
REACT_APP_API_BASE_URL=/api
REACT_APP_APP_URL=$APP_URL
EOF

# Set secure permissions
chmod 600 .env.prod

echo -e "${GREEN}✓${NC} Configuration file created: .env.prod"
echo -e "${GREEN}✓${NC} File permissions set to 600 (secure)"
echo ""

# Summary
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║              Setup Complete! 🎉                      ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  App URL: $APP_URL"
echo "  SMTP: $SMTP_ENABLED"
echo "  Max Login Attempts: $MAX_FAILED_LOGINS"
echo "  Lockout Duration: $LOCKOUT_MINUTES minutes"
echo ""
echo -e "${YELLOW}Important Security Notes:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  • Database password: $DB_PASSWORD"
echo "  • Keep .env.prod secure and never commit to git"
echo "  • Change admin password after first login"
echo "  • Default credentials: admin@example.com / changeme123"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Review .env.prod if needed"
echo "  2. Run: docker-compose -f docker-compose.prod.yml up -d"
echo "  3. Access: $APP_URL"
echo "  4. Login and change admin password immediately!"
echo ""
echo "For detailed deployment instructions, see DEPLOYMENT_GUIDE.md"
echo ""
