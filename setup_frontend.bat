@echo off
setlocal enabledelayedexpansion

echo =====================================
echo  CareHub Frontend Setup (Windows)
echo =====================================

REM 1) Check Node.js
node -v >nul 2>&1
IF ERRORLEVEL 1 (
  echo [!] Node.js not found. Please install LTS from https://nodejs.org/ and rerun.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODEVER=%%v
echo [+] Node.js !NODEVER! detected.

REM 2) Ensure .env exists (copy from example on first run)
IF NOT EXIST ".env" (
  IF EXIST ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo [+] Created .env from .env.example ^(update values if needed^).
  ) ELSE (
    echo [!] No .env or .env.example found. Proceeding without env vars.
  )
)

REM 3) Install deps (prefer clean install when lockfile exists)
IF EXIST "package-lock.json" (
  echo [+] Installing dependencies with npm ci...
  call npm ci
) ELSE (
  echo [+] Installing dependencies with npm install...
  call npm install
)
IF ERRORLEVEL 1 (
  echo [!] Dependency installation failed.
  pause
  exit /b 1
)

REM 4) Start the dev server (binds to 127.0.0.1 per package.json)
echo [+] Starting development server...
call npm run dev

echo Done.
pause
