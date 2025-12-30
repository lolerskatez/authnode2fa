#!/bin/bash

# AuthNode 2FA Production Deployment Script
# This script helps deploy the application to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
check_requirements() {
    log_info "Checking deployment requirements..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found!"
        log_error "Copy .env.prod.example to .env.prod and configure your settings."
        exit 1
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file $COMPOSE_FILE not found!"
        exit 1
    fi

    # Check if required environment variables are set
    required_vars=("SECRET_KEY" "ENCRYPTION_KEY" "POSTGRES_PASSWORD" "REDIS_PASSWORD")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE" || grep -q "^$var=CHANGE_THIS" "$ENV_FILE"; then
            log_error "Required environment variable $var is not properly set in $ENV_FILE"
            exit 1
        fi
    done

    log_success "Requirements check passed"
}

# Backup current deployment
backup_current() {
    if [ -d "backup" ]; then
        log_info "Removing old backup..."
        rm -rf backup
    fi

    if docker ps -q --filter "label=com.docker.compose.project=authnode2fa" | grep -q .; then
        log_info "Creating backup of current deployment..."

        mkdir -p backup
        docker-compose -f $COMPOSE_FILE ps > backup/containers.txt
        docker-compose -f $COMPOSE_FILE logs > backup/logs.txt

        log_success "Backup created"
    else
        log_info "No running containers to backup"
    fi
}

# Pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    docker-compose -f $COMPOSE_FILE pull
    log_success "Images pulled"
}

# Start services
start_services() {
    log_info "Starting services..."
    docker-compose -f $COMPOSE_FILE up -d --build
    log_success "Services started"
}

# Wait for services to be healthy
wait_healthy() {
    log_info "Waiting for services to be healthy..."

    # Wait for database
    log_info "Waiting for database..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose -f $COMPOSE_FILE exec -T db pg_isready -U "${POSTGRES_USER:-authnode2fa_user}" -d "${POSTGRES_DB:-authnode2fa}" >/dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        log_error "Database failed to become ready"
        exit 1
    fi

    # Wait for backend
    log_info "Waiting for backend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost/api/health >/dev/null 2>&1; then
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done

    if [ $timeout -le 0 ]; then
        log_error "Backend failed to become ready"
        exit 1
    fi

    log_success "All services are healthy"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    docker-compose -f $COMPOSE_FILE exec -T backend alembic upgrade head
    log_success "Migrations completed"
}

# Check deployment
check_deployment() {
    log_info "Checking deployment status..."

    # Check container status
    if ! docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
        log_error "Some containers are not running"
        docker-compose -f $COMPOSE_FILE ps
        exit 1
    fi

    # Check API health
    if ! curl -f http://localhost/api/health >/dev/null 2>&1; then
        log_error "API health check failed"
        exit 1
    fi

    # Check frontend
    if ! curl -f http://localhost/ >/dev/null 2>&1; then
        log_error "Frontend health check failed"
        exit 1
    fi

    log_success "Deployment check passed"
}

# Show status
show_status() {
    log_info "Deployment status:"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    log_info "Service logs (last 20 lines):"
    docker-compose -f $COMPOSE_FILE logs --tail=20
}

# Main deployment function
deploy() {
    log_info "Starting AuthNode 2FA production deployment..."

    check_requirements
    backup_current
    pull_images
    start_services
    wait_healthy
    run_migrations
    check_deployment

    log_success "🎉 Deployment completed successfully!"
    echo ""
    show_status
    echo ""
    log_info "Your application is now running at:"
    log_info "  Frontend: http://your-server-ip"
    log_info "  API: http://your-server-ip/api"
    log_info "  Adminer (DB): http://your-server-ip:8080"
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous deployment..."

    if [ -d "backup" ]; then
        # Stop current deployment
        docker-compose -f $COMPOSE_FILE down

        # Restore from backup (this is a simplified rollback)
        # In a real scenario, you'd have more sophisticated rollback logic
        log_info "Previous deployment logs available in backup/ directory"
    else
        log_error "No backup available for rollback"
        exit 1
    fi
}

# Main script
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose -f $COMPOSE_FILE restart
        ;;
    "stop")
        log_info "Stopping services..."
        docker-compose -f $COMPOSE_FILE down
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|logs|restart|stop}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application (default)"
        echo "  rollback - Rollback to previous deployment"
        echo "  status   - Show deployment status"
        echo "  logs     - Show service logs"
        echo "  restart  - Restart all services"
        echo "  stop     - Stop all services"
        exit 1
        ;;
esac
