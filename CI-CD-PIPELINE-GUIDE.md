# 🚀 SharpFlow CI/CD Pipeline Guide

## Overview

This guide provides comprehensive documentation for the SharpFlow CI/CD pipeline, designed specifically for the multi-tenant SaaS lead generation platform with AI agents (Falcon, Sage, Sentinel, Prism).

## 📋 Pipeline Architecture

### 🔄 Continuous Integration (CI)
- **Automated testing** on pull requests and main branch pushes
- **TypeScript type checking** and linting with ESLint
- **Unit test execution** with Jest and coverage reporting
- **Build verification** for Next.js frontend and Node.js backend
- **Multi-tenant functionality testing**
- **Docker image building** and security scanning

### 🚀 Continuous Deployment (CD)
- **Automated deployment** to staging and production environments
- **Docker image publishing** to GitHub Container Registry
- **Environment-specific configurations**
- **Health checks** and deployment verification
- **Rollback capabilities**

### 🔒 Security Pipeline
- **Dependency vulnerability scanning** with npm audit
- **CodeQL security analysis** for code vulnerabilities
- **Secret scanning** with TruffleHog
- **Container security scanning** with Trivy
- **License compliance checking**

### 🏷️ Release Management
- **Semantic versioning** with automated version bumping
- **Changelog generation** from commit messages
- **GitHub releases** with artifacts
- **Docker image tagging** and publishing

## 🛠️ Setup Instructions

### 1. Repository Secrets Configuration

Configure the following secrets in your GitHub repository settings:

#### Staging Environment
```
STAGING_SUPABASE_URL=https://your-staging-project.supabase.co
STAGING_SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key
STAGING_SUPABASE_ANON_KEY=your_staging_anon_key
STAGING_DATABASE_URL=postgresql://postgres:password@staging-db:5432/postgres
STAGING_JWT_SECRET=your_staging_jwt_secret_32_chars_minimum
STAGING_OPENAI_API_KEY=your_staging_openai_api_key
```

#### Production Environment
```
PROD_SUPABASE_URL=https://your-production-project.supabase.co
PROD_SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
PROD_SUPABASE_ANON_KEY=your_production_anon_key
PROD_DATABASE_URL=postgresql://postgres:password@prod-db:5432/postgres
PROD_JWT_SECRET=your_production_jwt_secret_32_chars_minimum
PROD_OPENAI_API_KEY=your_production_openai_api_key
PROD_PERPLEXITY_API_KEY=your_production_perplexity_api_key
PROD_APIFY_TOKEN=your_production_apify_token
PROD_PAYPAL_CLIENT_ID=your_production_paypal_client_id
PROD_PAYPAL_CLIENT_SECRET=your_production_paypal_client_secret
```

### 2. Branch Protection Rules

Configure branch protection for `main` branch:

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Include administrators

Required status checks:
- `🔍 Code Quality & Linting`
- `🧪 Unit Tests & Coverage`
- `🏗️ Build Verification`
- `🐳 Docker Build & Security`
- `🗄️ Database Migration Test`

### 3. Environment Setup

#### Development Environment
```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run tests
npm run test

# Build application
npm run build

# Run CI validation locally
npm run ci:validate
```

#### Docker Development
```bash
# Build Docker image
npm run docker:build

# Run with Docker
npm run docker:run
```

## 🔄 Workflow Triggers

### CI Pipeline (`ci.yml`)
- **Push** to `main`, `develop`, `feature/**`, `hotfix/**` branches
- **Pull requests** to `main`, `develop` branches
- **Manual trigger** via workflow_dispatch

### CD Pipeline (`cd.yml`)
- **Push** to `main` branch (staging deployment)
- **Tags** starting with `v*` (production deployment)
- **Manual trigger** with environment selection

### Security Pipeline (`security.yml`)
- **Push** to `main`, `develop` branches
- **Pull requests** to `main`, `develop` branches
- **Scheduled** daily at 2 AM UTC
- **Manual trigger** via workflow_dispatch

### Release Pipeline (`release.yml`)
- **Push** to `main` branch (auto-release)
- **Manual trigger** with release type selection

## 📊 Pipeline Stages

### Stage 1: Code Quality
1. **ESLint** - Code style and quality checks
2. **Prettier** - Code formatting verification
3. **TypeScript** - Type checking and compilation

### Stage 2: Testing
1. **Unit Tests** - Jest test execution with coverage
2. **Integration Tests** - Phase 3 and Phase 4 pipeline tests
3. **Multi-tenant Tests** - Isolation and functionality verification

### Stage 3: Build & Security
1. **Application Build** - Frontend and backend compilation
2. **Docker Build** - Multi-stage container creation
3. **Security Scan** - Vulnerability and secret scanning

### Stage 4: Deployment
1. **Staging Deployment** - Automatic on main branch
2. **Health Checks** - Application and service verification
3. **Production Deployment** - Manual or tag-triggered

## 🐳 Docker Configuration

### Multi-stage Build
- **Base Stage** - Dependencies installation
- **Builder Stage** - Application compilation
- **Production Stage** - Optimized runtime image

### Image Tagging Strategy
- `latest` - Latest stable release
- `v1.2.3` - Semantic version tags
- `main-abc123` - Branch and commit SHA
- `staging` - Staging environment

## 🔧 Local Development

### Prerequisites
- Node.js 18+
- Docker Desktop
- Git

### Setup
```bash
# Clone repository
git clone https://github.com/your-username/sharpflow.git
cd sharpflow

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your environment variables
# Edit .env with your API keys and configuration

# Run development server
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:phase3
npm run test:phase4
npm run test:multi-tenant

# Run CI validation
npm run ci:validate
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Failures
- Check TypeScript compilation errors
- Verify all dependencies are installed
- Ensure environment variables are set

#### 2. Test Failures
- Review test logs in GitHub Actions
- Run tests locally to debug
- Check database connectivity for integration tests

#### 3. Deployment Issues
- Verify secrets are configured correctly
- Check Docker image build logs
- Validate health check endpoints

#### 4. Security Scan Failures
- Review vulnerability reports
- Update dependencies with security patches
- Address any exposed secrets

### Getting Help

1. **Check GitHub Actions logs** for detailed error messages
2. **Review this documentation** for configuration requirements
3. **Run commands locally** to reproduce issues
4. **Create GitHub issues** for persistent problems

## 📈 Monitoring & Metrics

### CI/CD Metrics
- **Build success rate** - Track pipeline reliability
- **Test coverage** - Monitor code quality
- **Deployment frequency** - Measure delivery velocity
- **Lead time** - Time from commit to production

### Security Metrics
- **Vulnerability count** - Track security posture
- **Dependency freshness** - Monitor update frequency
- **Secret exposure** - Prevent credential leaks

## 🔄 Continuous Improvement

### Regular Maintenance
- **Weekly** - Review failed builds and tests
- **Monthly** - Update dependencies and security patches
- **Quarterly** - Review and optimize pipeline performance

### Pipeline Optimization
- **Cache optimization** - Improve build times
- **Parallel execution** - Reduce pipeline duration
- **Resource allocation** - Optimize runner usage
