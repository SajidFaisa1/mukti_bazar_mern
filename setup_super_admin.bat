@echo off
echo Creating Super Admin...
echo.

cd /d "%~dp0backend"
node migrations/createSuperAdmin.js

echo.
echo Migration completed!
pause
