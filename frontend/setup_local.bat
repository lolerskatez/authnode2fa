@echo off
REM Setup script for frontend local development (Windows)

echo Setting up frontend for local development...

REM Install dependencies
npm install
if %errorlevel% neq 0 (
    echo ✗ npm install failed
    exit /b 1
)
echo ✓ npm install completed

echo.
echo ✓ Frontend setup complete!
echo You can now run the frontend with: set PORT=8040 && npm start