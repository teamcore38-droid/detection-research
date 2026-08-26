@echo off
title AI Surveillance Backend API (FastAPI)
echo ============================================================
echo Starting AI Surveillance & Threat Detection Backend API...
echo ============================================================
cd /d "%~dp0"

REM Find Python executable with priority to Miniconda/Anaconda
set "PYTHON_EXE="
if exist "%USERPROFILE%\miniconda3\python.exe" (
    set "PYTHON_EXE=%USERPROFILE%\miniconda3\python.exe"
) else if exist "%USERPROFILE%\anaconda3\python.exe" (
    set "PYTHON_EXE=%USERPROFILE%\anaconda3\python.exe"
) else if exist "C:\miniconda3\python.exe" (
    set "PYTHON_EXE=C:\miniconda3\python.exe"
) else if exist "C:\anaconda3\python.exe" (
    set "PYTHON_EXE=C:\anaconda3\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo Using Python interpreter: %PYTHON_EXE%
"%PYTHON_EXE%" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
