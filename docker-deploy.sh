#!/bin/bash

# ============================================================================
# SharpFlow Docker Deployment Script
# Automated deployment script for SharpFlow lead generation platform
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "============================================================================"
    echo "  SharpFlow Docker Deployment Script"
    echo "  Multi-tenant SaaS Lead Generation Platform"
    echo "============================================================================"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f ".env.docker.example" ]; then
            cp .env.docker.example .env
            print_warning "Please edit .env file with your configuration before continuing."
            exit 1
        else
            print_error "No environment template found. Please create .env file manually."
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

validate_environment() {
    print_step "Validating environment configuration..."
    
    # Check required environment variables
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "JWT_SECRET"
        "OPENAI_API_KEY"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=your_" "$ENV_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing or unconfigured environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_error "Please configure these variables in $ENV_FILE"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

backup_data() {
    print_step "Creating backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup current containers (if any)
    if docker-compose ps | grep -q "Up"; then
        print_step "Backing up current deployment..."
        timestamp=$(date +"%Y%m%d_%H%M%S")
        backup_file="$BACKUP_DIR/sharpflow_backup_$timestamp.tar.gz"
        
        # Export container data
        docker-compose exec -T redis redis-cli BGSAVE || true
        
        # Create backup archive
        tar -czf "$backup_file" .env docker-compose*.yml || true
        
        echo -e "${GREEN}✅ Backup created: $backup_file${NC}"
    else
        echo -e "${YELLOW}ℹ️  No running containers to backup${NC}"
    fi
}

deploy_development() {
    print_step "Deploying development environment..."
    
    # Stop existing containers
    docker-compose down || true
    
    # Build and start development environment
    docker-compose up --build -d
    
    # Wait for services to be ready
    print_step "Waiting for services to start..."
    sleep 10
    
    # Check health
    check_health
    
    echo -e "${GREEN}✅ Development environment deployed successfully${NC}"
    echo -e "${BLUE}🌐 Application URL: http://localhost:3000${NC}"
    echo -e "${BLUE}📊 Redis URL: redis://localhost:6379${NC}"
}

deploy_production() {
    print_step "Deploying production environment..."
    
    # Stop existing containers
    docker-compose -f "$PROD_COMPOSE_FILE" down || true
    
    # Build and start production environment
    docker-compose -f "$PROD_COMPOSE_FILE" up --build -d
    
    # Wait for services to be ready
    print_step "Waiting for services to start..."
    sleep 15
    
    # Check health
    check_health_production
    
    echo -e "${GREEN}✅ Production environment deployed successfully${NC}"
    echo -e "${BLUE}🌐 Application URL: http://localhost:3000${NC}"
}

check_health() {
    print_step "Checking application health..."
    
    # Wait for application to be ready
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Application is healthy${NC}"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for application..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Application health check failed after $max_attempts attempts"
    docker-compose logs sharpflow-app
    return 1
}

check_health_production() {
    print_step "Checking production application health..."
    
    # Wait for application to be ready
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Production application is healthy${NC}"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for application..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Production application health check failed after $max_attempts attempts"
    docker-compose -f "$PROD_COMPOSE_FILE" logs sharpflow-app
    return 1
}

show_logs() {
    print_step "Showing application logs..."
    
    if [ "$1" = "prod" ]; then
        docker-compose -f "$PROD_COMPOSE_FILE" logs -f sharpflow-app
    else
        docker-compose logs -f sharpflow-app
    fi
}

stop_services() {
    print_step "Stopping services..."
    
    if [ "$1" = "prod" ]; then
        docker-compose -f "$PROD_COMPOSE_FILE" down
    else
        docker-compose down
    fi
    
    echo -e "${GREEN}✅ Services stopped${NC}"
}

show_status() {
    print_step "Service status:"
    
    echo -e "\n${BLUE}Development Environment:${NC}"
    docker-compose ps
    
    echo -e "\n${BLUE}Production Environment:${NC}"
    docker-compose -f "$PROD_COMPOSE_FILE" ps
}

show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev         Deploy development environment"
    echo "  prod        Deploy production environment"
    echo "  stop        Stop development environment"
    echo "  stop-prod   Stop production environment"
    echo "  logs        Show development logs"
    echo "  logs-prod   Show production logs"
    echo "  status      Show service status"
    echo "  backup      Create backup"
    echo "  health      Check application health"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev          # Deploy development environment"
    echo "  $0 prod         # Deploy production environment"
    echo "  $0 logs         # Follow development logs"
    echo "  $0 stop         # Stop all services"
}

# Main script
main() {
    print_header
    
    case "${1:-help}" in
        "dev")
            check_prerequisites
            validate_environment
            backup_data
            deploy_development
            ;;
        "prod")
            check_prerequisites
            validate_environment
            backup_data
            deploy_production
            ;;
        "stop")
            stop_services
            ;;
        "stop-prod")
            stop_services "prod"
            ;;
        "logs")
            show_logs
            ;;
        "logs-prod")
            show_logs "prod"
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_data
            ;;
        "health")
            check_health
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
