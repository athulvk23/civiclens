@echo off
title CivicLens - Community Problems to Action
echo ==========================================================
echo   CivicLens - AI Civic Issue Reporting ^& Triage Platform
echo ==========================================================
echo.
if not exist "node_modules" (
  echo [1/2] Installing project dependencies ^(first-time setup^)...
  call npm install
)
echo.
echo [2/2] Starting CivicLens server at http://localhost:5173/ ...
call npm run dev
pause
