@echo off
cd /d "%~dp0"
echo.
echo === ROLCC Local Preview ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in your PATH.
  echo Install from https://nodejs.org/ then close and reopen your terminal.
  pause
  exit /b 1
)

echo [1/2] Building articles...
node scripts\build-articles.js
if errorlevel 1 (
  echo.
  echo Build failed. See the error above.
  pause
  exit /b 1
)

echo.
echo [2/2] Starting preview server...
echo Open in your browser: http://localhost:3000/articles
echo Press Ctrl+C to stop the server.
echo.
node scripts\local-preview.js
