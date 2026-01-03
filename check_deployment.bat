@echo off
REM AuthNode 2FA - Windows Deployment Checker
REM Run this before deploying to production

echo ======================================
echo   AuthNode 2FA Deployment Checker
echo ======================================
echo.

set ERRORS=0
set WARNINGS=0

echo Checking prerequisites...
echo.

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Docker is installed
) else (
    echo [ERROR] Docker not installed
    set /a ERRORS+=1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Docker Compose is installed
) else (
    docker compose version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Docker Compose V2 is installed
    ) else (
        echo [ERROR] Docker Compose not installed
        set /a ERRORS+=1
    )
)

echo.
echo Checking required files...
echo.

if exist "docker-compose.prod.yml" (
    echo [OK] docker-compose.prod.yml exists
) else (
    echo [ERROR] docker-compose.prod.yml not found
    set /a ERRORS+=1
)

if exist ".env.prod" (
    echo [OK] .env.prod exists
    
    REM Check for default passwords
    findstr /C:"POSTGRES_PASSWORD=CHANGE_THIS" .env.prod >nul 2>&1
    if %errorlevel% equ 0 (
        echo [ERROR] POSTGRES_PASSWORD not set (still using default^)
        set /a ERRORS+=1
    ) else (
        echo [OK] POSTGRES_PASSWORD configured
    )
    
    findstr /C:"SECRET_KEY=CHANGE_THIS" .env.prod >nul 2>&1
    if %errorlevel% equ 0 (
        echo [ERROR] SECRET_KEY not set (still using default^)
        set /a ERRORS+=1
    ) else (
        echo [OK] SECRET_KEY configured
    )
    
    findstr /C:"REDIS_PASSWORD=CHANGE_THIS" .env.prod >nul 2>&1
    if %errorlevel% equ 0 (
        echo [ERROR] REDIS_PASSWORD not set (still using default^)
        set /a ERRORS+=1
    ) else (
        echo [OK] REDIS_PASSWORD configured
    )
    
) else (
    echo [ERROR] .env.prod not found - copy from .env.prod.example
    set /a ERRORS+=1
)

if exist "backend\Dockerfile.prod" (
    echo [OK] Backend production Dockerfile exists
) else (
    echo [ERROR] backend\Dockerfile.prod not found
    set /a ERRORS+=1
)

if exist "frontend\Dockerfile.prod" (
    echo [OK] Frontend production Dockerfile exists
) else (
    echo [ERROR] frontend\Dockerfile.prod not found
    set /a ERRORS+=1
)

if exist "backend\entrypoint.sh" (
    echo [OK] Backend entrypoint.sh exists
) else (
    echo [ERROR] backend\entrypoint.sh not found
    set /a ERRORS+=1
)

echo.
echo ======================================
echo   Verification Summary
echo ======================================
echo.

if %ERRORS% equ 0 (
    echo [SUCCESS] All checks passed! Ready for deployment.
    echo.
    echo Next steps:
    echo   1. Run: docker-compose -f docker-compose.prod.yml up -d
    echo   2. Check logs: docker-compose -f docker-compose.prod.yml logs -f
    echo   3. Access at: http://your-server-ip
    echo   4. Login with: admin@example.com / changeme123
    echo   5. CHANGE ADMIN PASSWORD IMMEDIATELY!
    pause
    exit /b 0
) else (
    echo [ERROR] %ERRORS% error(s) found
    echo.
    echo Please fix the errors above before deploying.
    pause
    exit /b 1
)
