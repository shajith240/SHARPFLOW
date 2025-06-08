# ============================================================================
# SharpFlow Lead Generation Platform - Production Dockerfile
# Multi-stage build for optimized production deployment
# ============================================================================

# Stage 1: Base dependencies and build environment
FROM node:18-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with npm ci for faster, reliable builds
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Development dependencies and build
FROM base AS builder

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
# 1. Build frontend with Vite
# 2. Build backend with esbuild
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sharpflow -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from base stage
COPY --from=base --chown=sharpflow:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=sharpflow:nodejs /app/dist ./dist
COPY --from=builder --chown=sharpflow:nodejs /app/package*.json ./

# Copy database setup scripts (needed for migrations)
COPY --from=builder --chown=sharpflow:nodejs /app/database-setup ./database-setup

# Copy shared schema and types
COPY --from=builder --chown=sharpflow:nodejs /app/shared ./shared

# Create logs directory
RUN mkdir -p /app/logs && chown sharpflow:nodejs /app/logs

# Switch to non-root user
USER sharpflow

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
