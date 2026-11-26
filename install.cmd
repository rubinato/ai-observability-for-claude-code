@echo off
rem Windows: double-click, or run from a terminal. Needs Node.js 22 or newer.
where node >nul 2>nul || (echo Node.js 22+ is required: https://nodejs.org & pause & exit /b 1)
node "%~dp0cli.mjs" install
pause
