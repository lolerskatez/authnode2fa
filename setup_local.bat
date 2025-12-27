@echo off
REM Main setup script for local development (Windows)

echo Setting up authnode2fa for local development...
echo.

REM Setup backend
echo Setting up backend...
cd backend
python setup_local.py
if %errorlevel% neq 0 (
    echo ✗ Backend setup failed
    exit /b 1
)
echo ✓ Backend setup completed
cd ..

echo.

REM Setup frontend
echo Setting up frontend...
cd frontend
call setup_local.bat
if %errorlevel% neq 0 (
    echo ✗ Frontend setup failed
    exit /b 1
)
echo ✓ Frontend setup completed
cd ..

echo.
echo ✓ All setup complete!
echo.
echo To run the application:
echo 1. Backend: cd backend && python run_server.py
echo 2. Frontend: cd frontend && set PORT=8040 && npm start
echo.
echo Then visit http://localhost:8040
pause