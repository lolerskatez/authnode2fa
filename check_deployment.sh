#!/bin/bash
# Pre-deployment verification script
# Run this before deploying to production

set -e

echo "======================================"
echo "  AuthNode 2FA Deployment Checker"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "Checking prerequisites..."
echo ""

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
    check_pass "Docker installed (version $DOCKER_VERSION)"
else
    check_fail "Docker not installed"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | cut -d ',' -f1)
    check_pass "Docker Compose installed (version $COMPOSE_VERSION)"
elif docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short)
    check_pass "Docker Compose V2 installed (version $COMPOSE_VERSION)"
else
    check_fail "Docker Compose not installed"
fi

echo ""
echo "Checking required files..."
echo ""

# Check required files
if [ -f "docker-compose.prod.yml" ]; then
    check_pass "docker-compose.prod.yml exists"
else
    check_fail "docker-compose.prod.yml not found"
fi

if [ -f ".env.prod" ]; then
    check_pass ".env.prod exists"
    
    # Check critical environment variables
    echo ""
    echo "Checking environment variables..."
    echo ""
    
    if grep -q "^POSTGRES_PASSWORD=CHANGE_THIS" .env.prod 2>/dev/null; then
        check_fail "POSTGRES_PASSWORD not set (still using default)"
    elif grep -q "^POSTGRES_PASSWORD=.\{16,\}" .env.prod 2>/dev/null; then
        check_pass "POSTGRES_PASSWORD configured (strong)"
    elif grep -q "^POSTGRES_PASSWORD=.+" .env.prod 2>/dev/null; then
        check_warn "POSTGRES_PASSWORD configured (but weak - use 16+ chars)"
    else
        check_fail "POSTGRES_PASSWORD not configured"
    fi
    
    if grep -q "^SECRET_KEY=CHANGE_THIS" .env.prod 2>/dev/null; then
        check_fail "SECRET_KEY not set (still using default)"
    elif grep -q "^SECRET_KEY=.\{32,\}" .env.prod 2>/dev/null; then
        check_pass "SECRET_KEY configured"
    else
        check_fail "SECRET_KEY not configured or too short"
    fi
    
    if grep -q "^REDIS_PASSWORD=CHANGE_THIS" .env.prod 2>/dev/null; then
        check_fail "REDIS_PASSWORD not set (still using default)"
    elif grep -q "^REDIS_PASSWORD=.+" .env.prod 2>/dev/null; then
        check_pass "REDIS_PASSWORD configured"
    else
        check_fail "REDIS_PASSWORD not configured"
    fi
    
    if grep -q "^APP_URL=https://" .env.prod 2>/dev/null; then
        check_pass "APP_URL configured with HTTPS"
    elif grep -q "^APP_URL=http://" .env.prod 2>/dev/null; then
        check_warn "APP_URL using HTTP (HTTPS recommended for production)"
    fi
    
    # Check ENCRYPTION_KEY (optional)
    if grep -q "^ENCRYPTION_KEY=.\+" .env.prod 2>/dev/null && ! grep -q "^ENCRYPTION_KEY=CHANGE_THIS" .env.prod 2>/dev/null; then
        check_pass "ENCRYPTION_KEY manually configured"
    else
        check_warn "ENCRYPTION_KEY not set (will be auto-generated - this is OK)"
    fi
    
else
    check_fail ".env.prod not found - copy from .env.prod.example"
fi

if [ -f "backend/Dockerfile.prod" ]; then
    check_pass "Backend production Dockerfile exists"
else
    check_fail "backend/Dockerfile.prod not found"
fi

if [ -f "frontend/Dockerfile.prod" ]; then
    check_pass "Frontend production Dockerfile exists"
else
    check_fail "frontend/Dockerfile.prod not found"
fi

echo ""
echo "Checking Dockerfiles..."
echo ""

# Check if Dockerfiles have proper configuration
if grep -q "ENTRYPOINT" backend/Dockerfile.prod 2>/dev/null; then
    check_pass "Backend Dockerfile has entrypoint for migrations"
else
    check_warn "Backend Dockerfile missing entrypoint (migrations may not run automatically)"
fi

if [ -f "backend/entrypoint.sh" ]; then
    check_pass "Backend entrypoint.sh exists"
    if [ -x "backend/entrypoint.sh" ]; then
        check_pass "Backend entrypoint.sh is executable"
    else
        check_warn "Backend entrypoint.sh exists but is not executable (will be fixed during build)"
    fi
else
    check_fail "backend/entrypoint.sh not found"
fi

echo ""
echo "Checking for security issues..."
echo ""

# Check if .env.prod has secure permissions
if [ -f ".env.prod" ]; then
    PERMS=$(stat -c "%a" .env.prod 2>/dev/null || stat -f "%A" .env.prod 2>/dev/null || echo "unknown")
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
        check_pass ".env.prod has secure permissions ($PERMS)"
    else
        check_warn ".env.prod permissions are $PERMS (should be 600): run 'chmod 600 .env.prod'"
    fi
fi

# Check if default admin password is documented
if grep -q "changeme123" .env.prod 2>/dev/null; then
    check_fail "Default admin password found in .env.prod - change it immediately after deployment"
fi

echo ""
echo "Checking network ports..."
echo ""

# Check if required ports are available
if command -v netstat &> /dev/null; then
    if netstat -tuln 2>/dev/null | grep -q ":80 "; then
        check_warn "Port 80 is already in use"
    else
        check_pass "Port 80 is available"
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ":443 "; then
        check_warn "Port 443 is already in use"
    else
        check_pass "Port 443 is available"
    fi
fi

echo ""
echo "======================================"
echo "  Verification Summary"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: docker-compose -f docker-compose.prod.yml up -d"
    echo "  2. Check logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  3. Access at: http://your-server-ip"
    echo "  4. Login with: admin@example.com / changeme123"
    echo "  5. CHANGE ADMIN PASSWORD IMMEDIATELY!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
    echo "You can proceed, but review the warnings above."
    exit 0
else
    echo -e "${RED}✗ ${ERRORS} error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi
