@echo off
REM update-dependencies.cmd
REM Performs dependency updates locally (steps 6-9 of security-updates workflow)
REM
REM Usage: scripts\update-dependencies.cmd
REM

setlocal enabledelayedexpansion

echo ============================================
echo Local Dependency Update Script
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
  echo [41m Error: package.json not found. Run this script from the project root. [0m
  exit /b 1
)

REM Check if scripts directory exists
if not exist "scripts" (
  echo [41m Error: scripts directory not found. [0m
  exit /b 1
)

REM Check if all required scripts exist
set "MISSING=0"
if not exist "scripts\update-overrides.js" (
  echo [41m Error: scripts\update-overrides.js not found. [0m
  set "MISSING=1"
)
if not exist "scripts\add-security-overrides.js" (
  echo [41m Error: scripts\add-security-overrides.js not found. [0m
  set "MISSING=1"
)
if not exist "scripts\test-overrides.js" (
  echo [41m Error: scripts\test-overrides.js not found. [0m
  set "MISSING=1"
)

if "%MISSING%"=="1" (
  exit /b 1
)

echo Step 1: Updating existing overrides to latest minor versions...
echo ----------------------------------------------
node scripts\update-overrides.js
if errorlevel 1 (
  echo [93m Warning: update-overrides.js completed with warnings [0m
)
echo.

echo Step 2: Adding security overrides for vulnerabilities...
echo ----------------------------------------------
node scripts\add-security-overrides.js
if errorlevel 1 (
  echo [93m Warning: add-security-overrides.js completed with warnings [0m
)
echo.

echo Step 3: Testing if overrides can be removed...
echo ----------------------------------------------
node scripts\test-overrides.js
if errorlevel 1 (
  echo [93m Warning: test-overrides.js completed with warnings [0m
)
echo.

echo Step 4: Updating package-lock.json...
echo ----------------------------------------------
npm install
if errorlevel 1 (
  echo [41m Error: npm install failed [0m
  exit /b 1
)
echo.

echo ============================================
echo [92m Dependency update complete! [0m
echo ============================================
echo.

REM Check if there are any changes
git diff --quiet package.json package-lock.json 2>nul
if errorlevel 1 (
  echo [94m Changes detected: [0m
  echo.
  git diff --stat package.json package-lock.json
  echo.
  echo Next steps:
  echo   1. Review the changes: git diff package.json
  echo   2. Run tests: npm test
  echo   3. Run code quality checks: npm run code-quality-check
  echo   4. Build: npm run build
  echo   5. Commit changes: git add package.json package-lock.json
  echo   6. Create commit: git commit -m "chore(deps): update dependencies"
) else (
  echo [90m No changes were made to package.json or package-lock.json [0m
)

endlocal
