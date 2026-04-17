@echo off
setlocal enabledelayedexpansion

echo 🚀 Mental Health Chat Backend Setup
echo ====================================
echo.

REM Check if .env exists
if exist ".env" (
    echo ✓ .env file already exists
) else (
    echo 📝 Creating .env file from template...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ✓ .env created. Please edit it with your OpenAI API key:
        echo    OPENAI_API_KEY=sk-your-key-here
    ) else (
        echo ❌ .env.example not found
        exit /b 1
    )
)

REM Check Node.js installation
where node >nul 2>nul
if !errorlevel! neq 0 (
    echo ❌ Node.js is not installed
    echo    Download from: https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% detected
echo.

REM Install dependencies
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo ❌ npm install failed
        exit /b 1
    )
    echo ✓ Dependencies installed
) else (
    echo ✓ Dependencies already installed
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit .env and add your OpenAI API key
echo 2. Run: npm start
echo 3. Backend will start on http://localhost:5000
echo.
echo Test the endpoint with curl or Postman:
echo   POST http://localhost:5000/chat
echo   Headers: Content-Type: application/json
echo   Body: {"userId":"test","message":"Hello"}
echo.
