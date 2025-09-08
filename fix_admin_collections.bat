@echo off
echo Fixing Admin Collections...
echo.

cd /d "%~dp0backend"
node migrations/fixAdminCollections.js

echo.
echo Admin collections fix completed!
pause
