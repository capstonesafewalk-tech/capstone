@echo off
REM SAFEWALK Admin Dashboard - Windows Setup Script

echo =====================================
echo SAFEWALK Admin Dashboard - Setup
echo =====================================
echo.

REM Check Node.js
where /q node
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js v14+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check npm
where /q npm
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%

echo.
echo Installing Backend Dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
cd ..

echo.
echo Installing Frontend Dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
cd ..

echo.
echo =====================================
echo [OK] Setup Complete!
echo =====================================
echo.
echo Next steps:
echo 1. Create MySQL database: mysql -u root -p ^< backend\database.sql
echo 2. Start backend: cd backend ^&^& npm run dev
echo 3. Start frontend (new terminal): cd frontend ^&^& npm start
echo 4. Access at http://localhost:3000
echo.
echo Default login:
echo Email: admin@safewalk.com
echo Password: (check backend/database.sql)
echo =====================================
echo.
pause
