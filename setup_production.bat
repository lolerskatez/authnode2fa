@echo off
REM AuthNode 2FA - Interactive Production Setup (Windows)
REM Auto-generates secure secrets and creates .env.prod

setlocal enabledelayedexpansion

cls
echo.
echo ======================================================
echo.
echo           AuthNode 2FA Setup Wizard
echo.
echo ======================================================
echo.
echo Welcome! This wizard will set up your production environment.
echo.
echo We'll auto-generate secure passwords and keys for you.
echo You only need to provide your domain and optional SMTP settings.
echo.
pause
cls

REM Check if .env.prod already exists
if exist ".env.prod" (
    echo Warning: .env.prod already exists!
    echo.
    set /p overwrite="Do you want to overwrite it? (yes/no): "
    if not "!overwrite!"=="yes" (
        echo Setup cancelled. Your existing .env.prod is safe.
        exit /b 0
    )
    echo.
)

echo Step 1/5: Database Configuration
echo ================================================
echo.

REM Generate database password (PowerShell for random generation)
for /f "delims=" %%i in ('powershell -Command "[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 })) -replace '[=+/]','' | Select-Object -First 32"') do set DB_PASSWORD=%%i
echo [OK] Auto-generated secure database password

REM Database name
set /p DB_NAME="Database name [authnode2fa_prod]: "
if "!DB_NAME!"=="" set DB_NAME=authnode2fa_prod

REM Database user
set /p DB_USER="Database user [authnode2fa_user]: "
if "!DB_USER!"=="" set DB_USER=authnode2fa_user

echo.
echo Step 2/5: Security Keys
echo ================================================
echo.

REM Generate SECRET_KEY (64 hex characters)
for /f "delims=" %%i in ('powershell -Command "-join ((1..32 | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }))"') do set SECRET_KEY=%%i
echo [OK] Auto-generated SECRET_KEY (64 characters)

REM Generate REDIS_PASSWORD
for /f "delims=" %%i in ('powershell -Command "[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 })) -replace '[=+/]','' | Select-Object -First 32"') do set REDIS_PASSWORD=%%i
echo [OK] Auto-generated Redis password

echo.
echo Encryption key for OTP secrets:
echo   - Leave empty to auto-generate on first run (recommended)
echo   - Or provide your own Fernet key
set /p ENCRYPTION_KEY="Encryption key [auto-generate]: "

echo.
echo Step 3/5: Application Settings
echo ================================================
echo.

REM Domain/URL
set /p DOMAIN="Your domain (e.g., 2fa.example.com): "
if "!DOMAIN!"=="" (
    set APP_URL=http://localhost
    echo Warning: No domain provided, using: !APP_URL!
) else (
    set /p USE_HTTPS="Use HTTPS? (yes/no) [yes]: "
    if "!USE_HTTPS!"=="" set USE_HTTPS=yes
    
    if "!USE_HTTPS!"=="yes" (
        set APP_URL=https://!DOMAIN!
    ) else (
        set APP_URL=http://!DOMAIN!
    )
)

echo [OK] Application URL set to: !APP_URL!

echo.
echo Step 4/5: Email/SMTP Configuration (Optional)
echo ================================================
echo.
echo SMTP enables email notifications for password resets.
set /p ENABLE_SMTP="Enable SMTP? (yes/no) [no]: "
if "!ENABLE_SMTP!"=="" set ENABLE_SMTP=no

if "!ENABLE_SMTP!"=="yes" (
    set /p SMTP_HOST="SMTP Host (e.g., smtp.gmail.com): "
    set /p SMTP_PORT="SMTP Port [587]: "
    if "!SMTP_PORT!"=="" set SMTP_PORT=587
    set /p SMTP_USERNAME="SMTP Username: "
    set /p SMTP_PASSWORD="SMTP Password: "
    set /p SMTP_FROM_EMAIL="From Email (e.g., noreply@yourdomain.com): "
    set /p SMTP_FROM_NAME="From Name [AuthNode 2FA]: "
    if "!SMTP_FROM_NAME!"=="" set SMTP_FROM_NAME=AuthNode 2FA
    set SMTP_ENABLED=true
) else (
    set SMTP_ENABLED=false
    set SMTP_HOST=
    set SMTP_PORT=587
    set SMTP_USERNAME=
    set SMTP_PASSWORD=
    set SMTP_FROM_EMAIL=
    set SMTP_FROM_NAME=AuthNode 2FA
)

echo.
echo Step 5/5: Security Settings
echo ================================================
echo.

set /p MAX_FAILED_LOGINS="Max failed login attempts [5]: "
if "!MAX_FAILED_LOGINS!"=="" set MAX_FAILED_LOGINS=5

set /p LOCKOUT_MINUTES="Account lockout duration (minutes) [15]: "
if "!LOCKOUT_MINUTES!"=="" set LOCKOUT_MINUTES=15

set /p LOGIN_RATE_LIMIT="Login rate limit (per minute) [5]: "
if "!LOGIN_RATE_LIMIT!"=="" set LOGIN_RATE_LIMIT=5

REM Generate .env.prod file
echo.
echo Generating configuration file...
echo.

(
echo # ==========================================
echo # AuthNode 2FA Production Configuration
echo # Generated: %date% %time%
echo # ==========================================
echo.
echo # ==========================================
echo # DATABASE CONFIGURATION
echo # ==========================================
echo POSTGRES_DB=!DB_NAME!
echo POSTGRES_USER=!DB_USER!
echo POSTGRES_PASSWORD=!DB_PASSWORD!
echo.
echo # ==========================================
echo # SECURITY KEYS
echo # ==========================================
echo SECRET_KEY=!SECRET_KEY!
echo REDIS_PASSWORD=!REDIS_PASSWORD!
echo.
) > .env.prod

if not "!ENCRYPTION_KEY!"=="" (
    echo # Encryption key for OTP secrets >> .env.prod
    echo ENCRYPTION_KEY=!ENCRYPTION_KEY! >> .env.prod
) else (
    echo # Encryption key - auto-generated on first run >> .env.prod
    echo # ENCRYPTION_KEY= >> .env.prod
)

(
echo.
echo # ==========================================
echo # APPLICATION CONFIGURATION
echo # ==========================================
echo APP_ENV=production
echo APP_URL=!APP_URL!
echo.
echo # ==========================================
echo # EMAIL/SMTP CONFIGURATION
echo # ==========================================
echo SMTP_ENABLED=!SMTP_ENABLED!
) >> .env.prod

if "!SMTP_ENABLED!"=="true" (
    (
    echo SMTP_HOST=!SMTP_HOST!
    echo SMTP_PORT=!SMTP_PORT!
    echo SMTP_USERNAME=!SMTP_USERNAME!
    echo SMTP_PASSWORD=!SMTP_PASSWORD!
    echo SMTP_FROM_EMAIL=!SMTP_FROM_EMAIL!
    echo SMTP_FROM_NAME=!SMTP_FROM_NAME!
    ) >> .env.prod
) else (
    (
    echo SMTP_HOST=
    echo SMTP_PORT=587
    echo SMTP_USERNAME=
    echo SMTP_PASSWORD=
    echo SMTP_FROM_EMAIL=
    echo SMTP_FROM_NAME=AuthNode 2FA
    ) >> .env.prod
)

(
echo.
echo # ==========================================
echo # RATE LIMITING CONFIGURATION
echo # ==========================================
echo LOGIN_RATE_LIMIT=!LOGIN_RATE_LIMIT!/minute
echo SIGNUP_RATE_LIMIT=3/minute
echo TOTP_VERIFY_RATE_LIMIT=10/minute
echo API_RATE_LIMIT=100/minute
echo SENSITIVE_API_RATE_LIMIT=30/minute
echo.
echo # ==========================================
echo # SECURITY SETTINGS
echo # ==========================================
echo MAX_FAILED_LOGIN_ATTEMPTS=!MAX_FAILED_LOGINS!
echo ACCOUNT_LOCKOUT_MINUTES=!LOCKOUT_MINUTES!
echo.
echo # ==========================================
echo # FRONTEND CONFIGURATION
echo # ==========================================
echo REACT_APP_API_BASE_URL=/api
echo REACT_APP_APP_URL=!APP_URL!
) >> .env.prod

echo [OK] Configuration file created: .env.prod
echo.

REM Summary
echo.
echo ======================================================
echo.
echo              Setup Complete!
echo.
echo ======================================================
echo.
echo Configuration Summary:
echo ================================================
echo   Database: !DB_NAME!
echo   User: !DB_USER!
echo   App URL: !APP_URL!
echo   SMTP: !SMTP_ENABLED!
echo   Max Login Attempts: !MAX_FAILED_LOGINS!
echo   Lockout Duration: !LOCKOUT_MINUTES! minutes
echo.
echo Important Security Notes:
echo ================================================
echo   * Database password: !DB_PASSWORD!
echo   * Keep .env.prod secure and never commit to git
echo   * Change admin password after first login
echo   * Default credentials: admin@example.com / changeme123
echo.
echo Next Steps:
echo ================================================
echo   1. Review .env.prod if needed
echo   2. Run: docker-compose -f docker-compose.prod.yml up -d
echo   3. Access: !APP_URL!
echo   4. Login and change admin password immediately!
echo.
echo For detailed deployment instructions, see DEPLOYMENT_GUIDE.md
echo.
pause
