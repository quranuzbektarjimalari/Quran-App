@echo off
chcp 65001 >nul
title Qur'on tilovati - .exe yaratish
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [XATO] Node.js topilmadi. https://nodejs.org dan LTS versiyasini o'rnating va qayta ishga tushiring.
  pause & exit /b 1
)
echo [1/2] Kutubxonalar o'rnatilmoqda (birinchi marta bir necha daqiqa ketadi)...
call npm install
if errorlevel 1 ( echo [XATO] npm install muvaffaqiyatsiz. & pause & exit /b 1 )
echo [2/2] .exe yig'ilmoqda...
call npm run dist
if errorlevel 1 (
  echo [XATO] Yig'ish muvaffaqiyatsiz. Bu faylni "Administrator sifatida" ishga tushirib ko'ring.
  pause & exit /b 1
)
echo.
echo TAYYOR! "dist" papkasida:
echo   - Quran-Tilovati-1.0.0-nsis.exe      (o'rnatuvchi)
echo   - Quran-Tilovati-1.0.0-portable.exe  (o'rnatmasdan ishlaydi)
start "" "%~dp0dist"
pause
