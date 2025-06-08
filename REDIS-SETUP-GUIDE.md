# Redis Setup Guide for SharpFlow Email Monitoring

## Overview
Redis is required for production email monitoring with job queues. For development, SharpFlow can use an in-memory queue system.

## Current Status
- ✅ **Development Mode**: In-memory queue enabled (`USE_REDIS=false`)
- ⚠️ **Production Mode**: Redis required for scalable email monitoring

## Installation Options

### Option 1: Docker (Recommended)
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/

# Run Redis container
docker run -d --name redis-sharpflow -p 6379:6379 redis:7-alpine

# Test connection
docker exec -it redis-sharpflow redis-cli ping
```

### Option 2: Windows Subsystem for Linux (WSL)
```bash
# Install WSL2 and Ubuntu
wsl --install

# In WSL terminal:
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Test connection
redis-cli ping
```

### Option 3: Chocolatey Package Manager
```powershell
# Install Chocolatey first: https://chocolatey.org/install

# Install Redis
choco install redis-64

# Start Redis service
redis-server

# Test connection (new terminal)
redis-cli ping
```

### Option 4: Manual Installation
1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`
3. Test with `redis-cli.exe ping`

## Configuration for Production

### 1. Enable Redis in Environment
```env
# In .env file
USE_REDIS=true
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_if_needed
```

### 2. Cloud Redis Options
- **Redis Cloud**: https://redis.com/redis-enterprise-cloud/
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/
- **Azure Cache for Redis**: https://azure.microsoft.com/en-us/services/cache/
- **Google Cloud Memorystore**: https://cloud.google.com/memorystore

### 3. Production Configuration
```env
# Production Redis with authentication
REDIS_URL=redis://username:password@your-redis-host:6379
USE_REDIS=true
```

## Email Monitoring Benefits with Redis

### Development (In-Memory Queue)
- ✅ Simple setup, no external dependencies
- ✅ Perfect for testing and development
- ❌ Jobs lost on server restart
- ❌ No horizontal scaling
- ❌ Limited to single server instance

### Production (Redis Queue)
- ✅ Persistent job storage
- ✅ Horizontal scaling across multiple servers
- ✅ Job retry and failure handling
- ✅ Real-time monitoring and metrics
- ✅ High availability and clustering

## Testing Redis Connection

Run the Phase 1 environment test:
```bash
cd server
npx tsx tests/phase1-environment-test.ts
```

## Next Steps

1. **For Development**: Continue with current in-memory setup
2. **For Production**: Install Redis using one of the options above
3. **Update Environment**: Set `USE_REDIS=true` when Redis is available
4. **Test Connection**: Verify Redis connectivity before deployment

## Troubleshooting

### Common Issues
- **Connection Refused**: Ensure Redis server is running
- **Permission Denied**: Check Redis configuration and firewall
- **Authentication Failed**: Verify REDIS_PASSWORD if authentication is enabled

### Debug Commands
```bash
# Check if Redis is running
redis-cli ping

# Monitor Redis activity
redis-cli monitor

# Check Redis info
redis-cli info
```

## Support
For Redis-specific issues, consult:
- Redis Documentation: https://redis.io/documentation
- Redis Community: https://redis.io/community
- SharpFlow Team: Create an issue in the repository
