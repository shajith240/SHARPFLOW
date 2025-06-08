@echo off
REM ============================================================================
REM SharpFlow Docker Deployment Script (Windows)
REM Automated deployment script for SharpFlow lead generation platform
REM ============================================================================

setlocal enabledelayedexpansion

REM Configuration
set COMPOSE_FILE=docker-compose.yml
set PROD_COMPOSE_FILE=docker-compose.prod.yml
set ENV_FILE=.env
set BACKUP_DIR=.\backups

REM Colors (limited support in Windows)
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set BLUE=[94m
set NC=[0m

goto main

:print_header
echo.
echo ============================================================================
echo   SharpFlow Docker Deployment Script (Windows)
echo   Multi-tenant SaaS Lead Generation Platform
echo ============================================================================
echo.
goto :eof

:print_step
echo %GREEN%[STEP]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:check_prerequisites
call :print_step "Checking prerequisites..."

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not installed. Please install Docker Desktop first."
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit /b 1
)

REM Check if .env file exists
if not exist "%ENV_FILE%" (
    call :print_warning ".env file not found. Creating from template..."
    if exist ".env.docker.example" (
        copy .env.docker.example .env >nul
        call :print_warning "Please edit .env file with your configuration before continuing."
        exit /b 1
    ) else (
        call :print_error "No environment template found. Please create .env file manually."
        exit /b 1
    )
)

echo %GREEN%✅ Prerequisites check passed%NC%
goto :eof

:validate_environment
call :print_step "Validating environment configuration..."

REM Check required environment variables
set missing_vars=0

findstr /B "SUPABASE_URL=" "%ENV_FILE%" | findstr /V "your_" >nul
if errorlevel 1 (
    echo Missing or unconfigured: SUPABASE_URL
    set missing_vars=1
)

findstr /B "SUPABASE_SERVICE_ROLE_KEY=" "%ENV_FILE%" | findstr /V "your_" >nul
if errorlevel 1 (
    echo Missing or unconfigured: SUPABASE_SERVICE_ROLE_KEY
    set missing_vars=1
)

findstr /B "JWT_SECRET=" "%ENV_FILE%" | findstr /V "your_" >nul
if errorlevel 1 (
    echo Missing or unconfigured: JWT_SECRET
    set missing_vars=1
)

findstr /B "OPENAI_API_KEY=" "%ENV_FILE%" | findstr /V "your_" >nul
if errorlevel 1 (
    echo Missing or unconfigured: OPENAI_API_KEY
    set missing_vars=1
)

if !missing_vars! equ 1 (
    call :print_error "Please configure missing variables in %ENV_FILE%"
    exit /b 1
)

echo %GREEN%✅ Environment validation passed%NC%
goto :eof

:backup_data
call :print_step "Creating backup..."

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Check if containers are running
docker-compose ps | findstr "Up" >nul
if not errorlevel 1 (
    call :print_step "Backing up current deployment..."
    
    REM Get timestamp
    for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a%%b
    set timestamp=%mydate%_%mytime%
    set backup_file=%BACKUP_DIR%\sharpflow_backup_%timestamp%.zip
    
    REM Create backup archive (simplified for Windows)
    powershell Compress-Archive -Path .env,docker-compose*.yml -DestinationPath "%backup_file%" -Force
    
    echo %GREEN%✅ Backup created: %backup_file%%NC%
) else (
    echo %YELLOW%ℹ️  No running containers to backup%NC%
)
goto :eof

:deploy_development
call :print_step "Deploying development environment..."

REM Stop existing containers
docker-compose down 2>nul

REM Build and start development environment
docker-compose up --build -d

REM Wait for services to be ready
call :print_step "Waiting for services to start..."
timeout /t 10 /nobreak >nul

REM Check health
call :check_health

echo %GREEN%✅ Development environment deployed successfully%NC%
echo %BLUE%🌐 Application URL: http://localhost:3000%NC%
echo %BLUE%📊 Redis URL: redis://localhost:6379%NC%
goto :eof

:deploy_production
call :print_step "Deploying production environment..."

REM Stop existing containers
docker-compose -f "%PROD_COMPOSE_FILE%" down 2>nul

REM Build and start production environment
docker-compose -f "%PROD_COMPOSE_FILE%" up --build -d

REM Wait for services to be ready
call :print_step "Waiting for services to start..."
timeout /t 15 /nobreak >nul

REM Check health
call :check_health_production

echo %GREEN%✅ Production environment deployed successfully%NC%
echo %BLUE%🌐 Application URL: http://localhost:3000%NC%
goto :eof

:check_health
call :print_step "Checking application health..."

set max_attempts=30
set attempt=1

:health_loop
curl -f -s http://localhost:3000/api/health >nul 2>&1
if not errorlevel 1 (
    echo %GREEN%✅ Application is healthy%NC%
    goto :eof
)

echo Attempt !attempt!/!max_attempts! - waiting for application...
timeout /t 2 /nobreak >nul
set /a attempt+=1

if !attempt! leq !max_attempts! goto health_loop

call :print_error "Application health check failed after %max_attempts% attempts"
docker-compose logs sharpflow-app
exit /b 1

:check_health_production
call :print_step "Checking production application health..."

set max_attempts=30
set attempt=1

:health_prod_loop
curl -f -s http://localhost:3000/api/health >nul 2>&1
if not errorlevel 1 (
    echo %GREEN%✅ Production application is healthy%NC%
    goto :eof
)

echo Attempt !attempt!/!max_attempts! - waiting for application...
timeout /t 2 /nobreak >nul
set /a attempt+=1

if !attempt! leq !max_attempts! goto health_prod_loop

call :print_error "Production application health check failed after %max_attempts% attempts"
docker-compose -f "%PROD_COMPOSE_FILE%" logs sharpflow-app
exit /b 1

:show_logs
call :print_step "Showing application logs..."

if "%~1"=="prod" (
    docker-compose -f "%PROD_COMPOSE_FILE%" logs -f sharpflow-app
) else (
    docker-compose logs -f sharpflow-app
)
goto :eof

:stop_services
call :print_step "Stopping services..."

if "%~1"=="prod" (
    docker-compose -f "%PROD_COMPOSE_FILE%" down
) else (
    docker-compose down
)

echo %GREEN%✅ Services stopped%NC%
goto :eof

:show_status
call :print_step "Service status:"

echo.
echo %BLUE%Development Environment:%NC%
docker-compose ps

echo.
echo %BLUE%Production Environment:%NC%
docker-compose -f "%PROD_COMPOSE_FILE%" ps
goto :eof

:show_help
echo Usage: %0 [COMMAND]
echo.
echo Commands:
echo   dev         Deploy development environment
echo   prod        Deploy production environment
echo   stop        Stop development environment
echo   stop-prod   Stop production environment
echo   logs        Show development logs
echo   logs-prod   Show production logs
echo   status      Show service status
echo   backup      Create backup
echo   health      Check application health
echo   help        Show this help message
echo.
echo Examples:
echo   %0 dev          # Deploy development environment
echo   %0 prod         # Deploy production environment
echo   %0 logs         # Follow development logs
echo   %0 stop         # Stop all services
goto :eof

:main
call :print_header

set command=%~1
if "%command%"=="" set command=help

if "%command%"=="dev" (
    call :check_prerequisites
    if errorlevel 1 exit /b 1
    call :validate_environment
    if errorlevel 1 exit /b 1
    call :backup_data
    call :deploy_development
) else if "%command%"=="prod" (
    call :check_prerequisites
    if errorlevel 1 exit /b 1
    call :validate_environment
    if errorlevel 1 exit /b 1
    call :backup_data
    call :deploy_production
) else if "%command%"=="stop" (
    call :stop_services
) else if "%command%"=="stop-prod" (
    call :stop_services prod
) else if "%command%"=="logs" (
    call :show_logs
) else if "%command%"=="logs-prod" (
    call :show_logs prod
) else if "%command%"=="status" (
    call :show_status
) else if "%command%"=="backup" (
    call :backup_data
) else if "%command%"=="health" (
    call :check_health
) else (
    call :show_help
)

endlocal
