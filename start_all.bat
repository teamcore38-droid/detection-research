@echo off
title AI Surveillance Launcher
echo ============================================================
echo Launching AI Surveillance & Threat Detection System...
echo ============================================================
start "Surveillance Backend" cmd /c "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "Surveillance Frontend" cmd /c "%~dp0run_frontend.bat"
echo.
echo ============================================================
echo System launched successfully!
echo - Backend API:  http://localhost:8000
echo - Swagger Docs: http://localhost:8000/docs
echo - Frontend UI:  http://localhost:5173
echo ============================================================
