@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo === Fix INTERAKT key ===
echo Open .env and make sure this line exists:
echo INTERAKT_API_KEY=PASTE_SECRET_KEY_HERE
echo.
echo Current folder:
echo %cd%
echo.
if exist .env (
  echo .env found
  findstr /B /C:"INTERAKT_API_KEY=" .env
) else (
  echo ERROR: .env not found in this folder
)
echo.
pause
