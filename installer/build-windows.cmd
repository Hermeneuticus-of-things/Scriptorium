@echo off
rem Pneuma Sofer: builds the installer wizard (Inno Setup 6) and the portable .exe on this Windows PC.
rem Double-click this file. Needs Node.js 22+ and Inno Setup 6 (already installed).
setlocal
chcp 65001 >nul
cd /d "%~dp0.."

where node >nul 2>nul || (echo Lipseste Node.js. Instaleaza-l de la https://nodejs.org ^(versiunea 22 sau mai noua^). & pause & exit /b 1)

echo [1/3] Instalez dependintele...
call npm ci || goto :fail

echo [2/3] Construiesc aplicatia si varianta portabila...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run dist:win || goto :fail

echo [3/3] Fac installerul cu wizard (Inno Setup)...
call npm run dist:win:setup || goto :fail

echo.
echo Gata. Fisierele sunt in folderul release:
dir /b release\*.exe
start "" "%cd%\release"
pause
exit /b 0

:fail
echo.
echo A aparut o eroare. Mesajul de mai sus spune unde.
pause
exit /b 1
