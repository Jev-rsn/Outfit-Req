@echo off
title Outfit Req Local Server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    pause
)
