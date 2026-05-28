@echo off
title Drop Dev Server
cd /d "%~dp0"

echo.
echo  ============================================
echo   DROP - Personal AI Idea Inbox
echo  ============================================
echo.
echo  Starting Expo dev server...
echo  Scan the QR code below with Expo Go.
echo.

call npx expo start

echo.
echo  Dev server stopped. Press any key to close.
pause >nul
