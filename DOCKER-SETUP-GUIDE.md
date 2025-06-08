# SharpFlow Docker Setup Guide

## Overview

This guide provides comprehensive Docker configuration for the SharpFlow lead generation platform, supporting both development and production deployments with multi-tenant SaaS architecture.

## Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git** for cloning the repository
- **Environment variables** configured (see Environment Setup)

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/shajith240/SHARPFLOW.git
cd SHARPFLOW
```

### 2. Environment Configuration

Copy the environment example and configure your variables:

```bash
cp server/.env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/[database]

# Authentication
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI Services
OPENAI_API_KEY=your_openai_api_key
PERPLEXITY_API_KEY=Bearer_your_perplexity_api_key

# External Services
APIFY_TOKEN=your_apify_token

# Email Configuration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENVIRONMENT=sandbox  # or 'live' for production
```

### 3. Automated Deployment (Recommended)

Use the provided deployment scripts for easier management:

**Linux/Mac:**

```bash
# Make script executable
chmod +x docker-deploy.sh

# Deploy development environment
./docker-deploy.sh dev

# Deploy production environment
./docker-deploy.sh prod

# View logs
./docker-deploy.sh logs

# Stop services
./docker-deploy.sh stop
```

**Windows:**

```cmd
# Deploy development environment
docker-deploy.bat dev

# Deploy production environment
docker-deploy.bat prod

# View logs
docker-deploy.bat logs

# Stop services
docker-deploy.bat stop
```

### 4. Manual Deployment

**Development:**

```bash
# Build and start development environment
docker-compose up --build

# Or run in background
docker-compose up -d --build

# View logs
docker-compose logs -f sharpflow-app
```

**Production:**

```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml up --build -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f sharpflow-app
```

## Services

### SharpFlow Application

- **Port**: 3000
- **Environment**: Development/Production
- **Features**: Multi-tenant SaaS, AI agents, lead generation
- **Health Check**: `/api/health`

### Redis

- **Port**: 6379
- **Purpose**: Email monitoring queues, job processing
- **Persistence**: Enabled with AOF

### PostgreSQL (Optional)

- **Port**: 5432
- **Purpose**: Local development database (alternative to Supabase)
- **Note**: Commented out by default, uncomment if needed

## Deployment Scripts

### Available Commands

The deployment scripts provide automated management with built-in validation and health checks:

```bash
# Linux/Mac
./docker-deploy.sh [COMMAND]

# Windows
docker-deploy.bat [COMMAND]
```

**Commands:**

- `dev` - Deploy development environment with hot reload
- `prod` - Deploy production environment with optimizations
- `stop` - Stop development environment
- `stop-prod` - Stop production environment
- `logs` - Show development logs (follow mode)
- `logs-prod` - Show production logs (follow mode)
- `status` - Show service status for both environments
- `backup` - Create backup of current deployment
- `health` - Check application health endpoint
- `help` - Show help message

### Script Features

- **Prerequisites Check**: Validates Docker and Docker Compose installation
- **Environment Validation**: Checks required environment variables
- **Automatic Backup**: Creates backups before deployment
- **Health Monitoring**: Waits for services and validates health endpoints
- **Error Handling**: Provides clear error messages and rollback options
- **Cross-Platform**: Works on Linux, Mac, and Windows

## Docker Commands

### Development

```bash
# Start development environment
docker-compose up

# Rebuild after code changes
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Execute commands in container
docker-compose exec sharpflow-app npm run test
```

### Production

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Update production deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build

# Monitor production logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale application (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale sharpflow-app=3
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml if 3000 or 6379 are in use
2. **Environment variables**: Ensure all required variables are set in `.env`
3. **Build failures**: Check Docker logs and ensure all dependencies are available
4. **Database connection**: Verify Supabase credentials and network connectivity

### Debugging

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 sharpflow-app

# Execute shell in container
docker-compose exec sharpflow-app sh

# Check Redis connection
docker-compose exec redis redis-cli ping
```

## Security Considerations

- **Environment Variables**: Never commit `.env` files to version control
- **Non-root User**: Application runs as non-root user `sharpflow`
- **Network Isolation**: Services communicate through dedicated Docker network
- **Health Checks**: Automated health monitoring for production deployments

## Performance Optimization

### Production Optimizations

- Multi-stage Docker build for smaller images
- Resource limits and reservations
- Redis memory optimization
- Health checks for reliability

### Development Features

- Hot reload with volume mounts
- Source code synchronization
- Development-specific environment variables

## Monitoring

### Health Checks

- Application: `http://localhost:3000/api/health`
- Redis: `redis-cli ping`

### Logs

- Application logs: `docker-compose logs sharpflow-app`
- Redis logs: `docker-compose logs redis`

## Next Steps

1. **SSL/TLS**: Configure HTTPS for production with reverse proxy
2. **Load Balancing**: Use Nginx or cloud load balancer for scaling
3. **Monitoring**: Integrate with monitoring solutions (Prometheus, Grafana)
4. **Backup**: Implement database backup strategies
5. **CI/CD**: Set up automated deployment pipelines
