@echo off
REM ============================================================================
REM SharpFlow CI/CD Commit Script (Windows)
REM Automated script to commit and push CI/CD pipeline changes
REM ============================================================================

echo 🚀 SharpFlow CI/CD Pipeline Commit Script
echo ==========================================

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed or not in PATH
    exit /b 1
)

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ Not in a git repository
    exit /b 1
)

echo 📋 Checking git status...
git status --porcelain

echo.
echo 📦 Adding CI/CD pipeline files...

REM Add specific CI/CD files
git add .github/
git add scripts/
git add server/tests/ci-pipeline.test.ts
git add server/tests/multi-tenant-isolation.test.ts
git add package.json
git add .gitignore
git add .eslintrc.cjs
git add .prettierrc.json
git add .prettierignore
git add CI-CD-PIPELINE-GUIDE.md
git add README.md

echo ✅ Files added to staging area

echo.
echo 📝 Creating commit...

REM Create a comprehensive commit message
git commit -m "feat: implement comprehensive CI/CD pipeline for SharpFlow

🔄 CI/CD Pipeline Features:
- Automated testing with Jest and TypeScript checking
- Code quality enforcement with ESLint and Prettier
- Multi-tenant isolation testing for SaaS architecture
- Docker containerization with multi-stage builds
- Security scanning with CodeQL, Trivy, and dependency auditing
- Automated deployment to staging and production environments
- Health checks and deployment verification scripts
- Automated dependency updates and vulnerability patching

🛠️ GitHub Actions Workflows:
- ci.yml: Continuous Integration pipeline
- cd.yml: Continuous Deployment pipeline  
- security.yml: Security scanning and vulnerability detection
- release.yml: Automated release management
- dependency-update.yml: Automated dependency updates

🧪 Testing Infrastructure:
- Multi-tenant isolation tests
- CI/CD pipeline verification tests
- Health check and deployment verification scripts
- Comprehensive test coverage reporting

📚 Documentation:
- Complete CI/CD pipeline guide
- Setup instructions and troubleshooting
- GitHub Actions workflow documentation
- Multi-tenant architecture testing guidelines

🔒 Security Features:
- Secret scanning with TruffleHog
- Container vulnerability scanning with Trivy
- Dependency vulnerability auditing
- License compliance checking
- Automated security patch management

This pipeline supports SharpFlow's goal of scaling to a million-dollar SaaS platform
with enterprise-grade CI/CD practices and multi-tenant architecture validation."

echo ✅ Commit created successfully!

echo.
echo 🔍 Showing commit details...
git log --oneline -1

echo.
echo 📤 Ready to push to remote repository!
echo Run: git push origin main
echo.
echo 🎯 Next steps after pushing:
echo 1. Go to your GitHub repository
echo 2. Configure repository secrets for staging and production
echo 3. Set up branch protection rules
echo 4. Create a test pull request to verify the pipeline
echo.
echo ✨ CI/CD pipeline setup complete!

pause
